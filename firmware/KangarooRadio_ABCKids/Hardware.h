#pragma once
// DFRobot DFR1139, FireBeetle 2 ESP32-E N16R2 ONLY. Raw GPIO numbers.
// GPIO16 is reserved for PSRAM; GPIO34 is the onboard battery divider.
constexpr int PIN_I2S_BCLK = 26; // D3
constexpr int PIN_I2S_LRC = 25;  // D2
constexpr int PIN_I2S_DOUT = 13; // D7
constexpr int PIN_OLED_SDA = 21;
constexpr int PIN_OLED_SCL = 22;
constexpr int PIN_RFID_CS = 4;   // D12 (reader's SDA pin is SPI chip select)
constexpr int PIN_RFID_RST = 17; // D10
constexpr int PIN_RFID_SCK = 18;
constexpr int PIN_RFID_MISO = 19;
constexpr int PIN_RFID_MOSI = 23;
constexpr int PIN_BUTTON = 14;   // D6
constexpr int PIN_VOLUME = 35;  // A3, ADC1
constexpr int PIN_BATTERY = 34; // A2, onboard 1:1 divider; never wire to pot
constexpr unsigned OLED_ADDRESS = 0x3C;
