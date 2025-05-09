(function () {
    'use strict';

    var chosenItm;

    var magicKeyCnt = 0;
    var hiddenMenu = false;
    var isInputActive = false;

    /**
     * Input field.
     */
    function showInputField() {
        if (isInputActive) return;
    
        isInputActive = true;

        var inputDiv = document.createElement("div");
        inputDiv.id = "emptyInput";
        inputDiv.classList.add("input");

        var input = document.createElement("input");
        input.id = "input";
        input.type = "text";
        input.style.fontSize = "30px";

        input.placeholder = 
            chosenItm.name === 'Read data' 
            ? "{address} {size}" :
                chosenItm.name === 'Write data' 
            ? "{address} {value}" : "";

        input.addEventListener("keydown", handleKeyDownInput);

        inputDiv.appendChild(input);
        document.body.appendChild(inputDiv);

        input.focus();
    
    }

    function closeInputField() {
        let inputDiv = document.getElementById('emptyInput');
            if (inputDiv) {
                inputDiv.remove();
            }

        isInputActive = false;

    }

    function saveToUSB() {
        tizen.filesystem.listStorages(function(storages) {
            for (var i = 0; i < storages.length; i++) {
                if (storages[i].type === "EXTERNAL" && storages[i].state === "MOUNTED") {
                    var fullPath = storages[i].label + "/response.txt";
                    var fileSaver = tizen.filesystem.openFile(fullPath, "w");
                    fileSaver.writeString(sessionStorage.getItem("lastResponse") || "No data");
                    fileSaver.close();
                    log("Succeeded to create the file!");
                    return;
                }
            }
            log("USB Flash Drive not connected");
        });
    }

    /**
     * Logs.
     * @param {string} msg - Message to log.
     */
    function log(msg) {
        var logsEl = document.getElementById('logs');
            
        logsEl.innerHTML += msg + '<br />';

        logsEl.scrollTop = logsEl.scrollHeight;
    }


    /**
     * Set up local message port.
     */
    function setLocalPort() {
        try {
            var localPort = tizen.messageport.requestLocalMessagePort("webport");

            localPort.addMessagePortListener(function (data) {
                if (data.length > 0) {
                    log(data[0].value);
                    sessionStorage.setItem("lastResponse", data[0].value);
                }
            });
        } catch (e) {
            log(e);
        }
    }

    /**
     * Send msg to service.
     */
    function sendMsg() {
        try {
            var remotePort = tizen.messageport.requestRemoteMessagePort(
                "2pUgzM8cvD.TizenDebugService",
                "serviceport"
            );

            remotePort.sendMessage(chosenItm.data);
        } catch (error) {
            log("The Tizen Debug Service is not running yet. Please wait for the notification.");
        }
    }

    /**
     * Configuration data for different items.
     */
    var items = {
            GET_VALUE: {
            name: 'Get value',
            data: [{ key: "command", value:"get_value"}]
        },
        SET_DEFAULT: {
            name: 'Set default',
            data: [{ key: "command", value:"set_default"}]
        },
        SET_GLOBAL: {
            name: 'Set global',
            data: [{ key: "command", value:"set_global"}]
        },
        FACTORY_MENU: {
            name: 'Run factory',
            data: [{ key: "command", value:"run_factory"}]
        },
        READ_DATA: {
            name: 'Read data',
            data: [],
            hidden: true
        },
        WRITE_DATA: {
            name: 'Write data',
            data: [],
            hidden: true
        },
        SAVE_USB: {
            name: 'Save to USB',
            data: [],
            hidden: true
        }
    
    }

    function appendMenu(key) {
        const itmParent = document.querySelector('.items');
        let li = document.createElement('li');
        li.className = li.innerHTML = items[key].name;
        li.dataset.itm = key;
        itmParent.appendChild(li);

    }

    function enableHiddenMenu() {
        if (items.READ_DATA.hidden === false && items.WRITE_DATA.hidden === false && items.SAVE_USB.hidden) {
            return
        }

        items.READ_DATA.hidden = false;
        items.WRITE_DATA.hidden = false;
        appendMenu('READ_DATA');
        appendMenu('WRITE_DATA');
        appendMenu('SAVE_USB');
        
    }

    /**
     * Check for magic key.
     */
    function checkMagicKey(keyCode) {
        if (!hiddenMenu) {
        if (keyCode === 37) {
            magicKeyCnt++;
            if (magicKeyCnt > 5) enableHiddenMenu();
        } else {
            magicKeyCnt = 0;
        }
        }
    }

    /**
     * Register keys used in this application.
     */
    function registerKeys() {
        var usedKeys = [];
  
        usedKeys.forEach(
            function (keyName) {
                tizen.tvinputdevice.registerKey(keyName);
            }
        );
    }

    /**
     * Handle input from remote
     */
    function registerKeyHandler() {
        document.addEventListener('keydown', function (e) {
            if (isInputActive) return;
            checkMagicKey(e.keyCode);


            switch (e.keyCode) {
                case 13:    // Enter
                        if (chosenItm.name === 'Read data') {
                            showInputField();
                        } else if (chosenItm.name === 'Write data') {
                            showInputField();
                        } else if (chosenItm.name === 'Save to USB') {
                            saveToUSB();
                        } else {
                            sendMsg();
                        }
                    break;
                case 38:    //UP arrow
                    switchItm('up');
                    break;
                case 40:    //DOWN arrow
                    switchItm('down');
                    break;
                case 10009: // Return
                    tizen.application.getCurrentApplication().exit();
                    break;
            }
        });
    }

    /**
     * Create read/ write data.
     * @param {string} inputData
     */
    function handleKeyDownInput(event, inputData) {
        switch(event.keyCode) {
            case 13: // Enter
            case 65376: // OK
            var inputData = document.getElementById('input').value.trim();

                if (inputData) {
                    var parts = inputData.split(" ").filter(Boolean);
                    var address = parts[0];
                    var size = parts[1];

                    chosenItm.data = 
                    chosenItm.name === 'Read data'
                    ? [{ key: "data", value: ["read_data", address, size] }] :
                    chosenItm.name === 'Write data'
                    ? [{ key: "data", value: ["write_data", address, size] }] : [];
                    sendMsg();
                } else {
                    log("unknown");
                }

                closeInputField();
                break;

            case 10009: // RETURN
                event.preventDefault();
                event.stopPropagation();
                closeInputField();
                break;
        }
    }

    /**
     * Create items switching list
     */
    function createItmList () {
        var itmParent = document.querySelector('.items');
        var currentItm;
        var li;
        for (var itmID in items) {
            if (!items[itmID].hidden) {
                li = document.createElement('li');
                li.className = li.innerHTML = items[itmID].name;
                li.dataset.itm = itmID;
                itmParent.appendChild(li);
            }
        }
        currentItm = itmParent.firstElementChild;
        currentItm.classList.add('itmFocused');
        setChosenItm(items[currentItm.dataset.itm]);
    }


    /**
     * Set information about chosen item.
     */
    function setChosenItm (itm) {
        chosenItm = itm;
    }

    /**
     * Changes data settings according to user's action
     * @param {String} direction - 'up' or 'down'
     */
    function switchItm (direction) {
        var itmParent = document.querySelector('.items');
        var currentItm = itmParent.querySelector('.itmFocused');

        currentItm.classList.remove('itmFocused');
        if (direction === 'up') {
            if (currentItm === itmParent.firstElementChild) {
                currentItm = itmParent.lastElementChild;
            } else {
                currentItm = currentItm.previousElementSibling;
            }
        } else if (direction === 'down') {
            if (currentItm === itmParent.lastElementChild) {
                currentItm = itmParent.firstElementChild;
            } else {
                currentItm = currentItm.nextElementSibling;
            }
        }
        currentItm.classList.add('itmFocused');
        setChosenItm(items[currentItm.dataset.itm]);
    }

    /**
     * Function initialising application.
     */
    window.onload = function () {
        createItmList();
        registerKeys();
        registerKeyHandler();
        setLocalPort();
        
    }

}());
