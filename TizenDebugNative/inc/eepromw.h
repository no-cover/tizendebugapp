/*
 * eepromwrapper.h
 */

#ifndef _EEPROMW_H_
#define _EEPROMW_H_

#include <stdint.h>
#include <tizen.h>

#ifndef EXPORT_API
#define EXPORT_API __attribute__((__visibility__("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

EXPORT_API int eeprom_read(uint32_t addr, uint32_t size, uint8_t* buffer);
EXPORT_API int eeprom_write(uint32_t addr, int length, const void* buffer);

#ifdef __cplusplus
}
#endif
#endif // _EEPROMW_H_
