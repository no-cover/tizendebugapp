using System;
using System.Runtime.InteropServices;
using Tizen.Applications;
using Tizen.Applications.Messages;
using Tizen.Applications.Notifications;

namespace TizenDebugService
{
    class App : ServiceApplication
    {
        private MessagePort LocalMsgPort;
        private MessagePort RemoteMsgPort;
        private const string LocalPortName = "serviceport";
        private const string RemotePortName = "webport";
        private const string WebAppId = "2pUgzM8cvD.TizenDebugApp";

        static class ExternalLib {

            [DllImport("libeeprom-map.so", CallingConvention = CallingConvention.Cdecl, EntryPoint = "eeprom_read")]
            public static extern int Read(uint address, uint size, byte[] buffer);

            [DllImport("libeeprom-map.so", CallingConvention = CallingConvention.Cdecl, EntryPoint = "eeprom_write")]
            public static extern int Write(uint address, int length, IntPtr buffer);

        }

        protected override void OnCreate()
        {
            base.OnCreate();

            LocalMsgPort = new MessagePort(LocalPortName, false);
            LocalMsgPort.Listen();
            LocalMsgPort.MessageReceived += OnMessageReceived;

            RemoteMsgPort = new MessagePort(RemotePortName, false);
            RemoteMsgPort.Listen();
            
        }

        private void DoThing (string command){
            if (command == "get_value") {

                byte[] buffer = new byte[1];
                int res = ExternalLib.Read(0x3e65, 1, buffer);
                string pong = BitConverter.ToString(buffer);
                Preference.Set("default", pong);
                if (res >= 0)
                {
                    SendMessageToWeb($"Succeeded to get the value: {pong}");
                }
                else
                {
                    SendMessageToWeb("ERROR " + res);
                }

            }
            else if (command == "set_default")
            {
                if (Preference.Contains("default")) {

                    byte value = Convert.ToByte(Preference.Get<string>("default"), 16);
                    byte[] data = { value };
                    IntPtr point = Marshal.AllocHGlobal(data.Length);
                    Marshal.Copy(data, 0, point, data.Length);

                    int res = ExternalLib.Write(0x3e65, data.Length, point);

                    Marshal.FreeHGlobal(point);

                    if (res >= 0)
                    {
                        SendMessageToWeb($"Succeeded to set the value: {value}");
                    }
                    else
                    {
                        SendMessageToWeb("ERROR " + res);
                    }
                }
                else
                {
                    SendMessageToWeb("Properties not found");
                }
                
            }
            else if (command == "set_global")
            {
                byte[] data = { 2 };
                IntPtr point = Marshal.AllocHGlobal(data.Length);
                Marshal.Copy(data, 0, point, data.Length);

                int res = ExternalLib.Write(0x3e65, data.Length, point);

                Marshal.FreeHGlobal(point);

                if (res >= 0)
                {
                    SendMessageToWeb("Succeeded to set the value: [0x02]");
                }
                else
                {
                    SendMessageToWeb("ERROR " + res);
                }
            }
            else if (command == "run_factory")
            {
                AppControl launchReq = new AppControl();
                launchReq.ApplicationId = "org.tizen.factory";
			    AppControl.SendLaunchRequest(launchReq);
                SendMessageToWeb("Process exit!");
            }
            
        }

        private void Get(uint addr, uint size){
            byte[] buffer = new byte[size];
            int res = ExternalLib.Read(addr, size, buffer);
            string data = BitConverter.ToString(buffer);

            if (res >= 0)
            {
                SendMessageToWeb($"Succeeded to get the data: {data}");
            }
            else
            {
                SendMessageToWeb("ERROR " + res);
            }

        }
        private void Set(uint addr, byte value){
            byte[] data = { value };
            IntPtr point = Marshal.AllocHGlobal(data.Length);
            Marshal.Copy(data, 0, point, data.Length);

            int res = ExternalLib.Write(addr, data.Length, point);

            Marshal.FreeHGlobal(point);
            if (res >= 0)
            {
                SendMessageToWeb($"Succeeded to set the value: {value}");
            }
            else
            {
                SendMessageToWeb("ERROR " + res);
            }

        }

        private void OnMessageReceived(object sender, MessageReceivedEventArgs e){
            if (e.Message.Contains("data"))
            {
                string[] receivedArray = e.Message.GetItem<string[]>("data");

                string key = receivedArray[0];

                    if (key == "read_data")
                    {
                        uint addr = Convert.ToUInt32(receivedArray[1], 16);
                        uint size = Convert.ToUInt32(receivedArray[2]);
                        Get(addr, size);
                    }
                    else if (key == "write_data")
                    {
                        uint addr = Convert.ToUInt32(receivedArray[1], 16);
                        byte value = Convert.ToByte(receivedArray[2]);
                        Set(addr, value);

                    }
            }
            else if (e.Message.Contains("command"))
            {
                string receivedData = e.Message.GetItem<string>("command");
                DoThing(receivedData);
            }
        }

        private void SendMessageToWeb(string message)
        {
            var responseMessage = new Bundle();
            responseMessage.AddItem("data", message);

            RemoteMsgPort.Send(responseMessage, WebAppId, RemotePortName);
        }

        static void Main(string[] args)
        {
            try {
                Marshal.PrelinkAll(typeof(ExternalLib));

                Notification notification = new Notification
                {
                    Title = "Tizen Debug Service",
                    Content = "The service is now ready to use",
                    Count = 1
                };
                NotificationManager.Post(notification);

            App app = new App();
            app.Run(args);

            } catch {
                Notification notification = new Notification
                {
                    Title = "Tizen Debug Service Error!",
                    Content = "Libarys not found",
                    Count = 1
                };
                NotificationManager.Post(notification);
            }
        }
    }
}
