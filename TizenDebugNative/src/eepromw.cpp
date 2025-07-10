/*
 * eepromwrapper.cpp
 */

#include "eepromw.h"
#include <dlfcn.h>
#include <stdio.h>
#include <stdint.h>

typedef int (*eeprom_read_t)(uint32_t addr, uint32_t size, uint8_t* buffer);
typedef int (*eeprom_write_t)(uint32_t addr, int length, const void* buffer);

static eeprom_read_t real_read = nullptr;
static eeprom_write_t real_write = nullptr;
static void* handle = nullptr;

__attribute__((constructor))
void init_eepromw()
{
    const char* paths[] = {
        "/usr/lib/libeeprom-map.so.0.1",
        "/prd/usr/lib/libeeprom-map.so.0.1"
    };

    for (const char* path : paths) {
        handle = dlopen(path, RTLD_NOW);
        if (handle) {
            fprintf(stderr, "[~eepromwrapper ~lib ~%s]", path);
            real_read = (eeprom_read_t)dlsym(handle, "eeprom_read");
            real_write = (eeprom_write_t)dlsym(handle, "eeprom_write");

            if (real_read && real_write) {
                fprintf(stderr, "[~eepromwrapper ~r/w ~func ~loaded]");
                return;
            }

            fprintf(stderr, "[~eepromwrapper ~dlsym ~failed]");
            dlclose(handle);
            handle = nullptr;
        } else {
            fprintf(stderr, "[~eepromwrapper ~dlopen ~failed ~%s]", dlerror());
        }
    }

    fprintf(stderr, "[~eepromwrapper ~failed ~load ~lib]");
}

__attribute__((destructor))
void fini_eepromw()
{
    if (handle) {
        dlclose(handle);
        handle = nullptr;
    }
}

extern "C" {
    EXPORT_API int eeprom_read(uint32_t addr, uint32_t size, uint8_t* buffer)
    {
        if (!real_read) {
            fprintf(stderr, "[~eepromwrapper ~read ~failed]");
            return -1;
        }
        return real_read(addr, size, buffer);
    }

    EXPORT_API int eeprom_write(uint32_t addr, int length, const void* buffer)
    {
        if (!real_write) {
            fprintf(stderr, "[~eepromwrapper ~write ~failed]");
            return -1;
        }
        return real_write(addr, length, buffer);
    }
}
