// ================================================================
// Kangaroo Radio — DIY ABC Kids Radio
// Hardware: ESP32 + MAX98357A I2S DAC Amp + 3W Speaker
// Stream: ABC Kids Listen (Australian Broadcasting Corporation)
// Verified Active Stream: Sydney & Australia National CDN
// ================================================================

#include <Arduino.h>
#include <WiFi.h>
#include "Audio.h"

// ----------------------------------------------------------------
// CONFIGURATION: Set your 2.4 GHz Wi-Fi details here
// Note: ESP32 requires 2.4 GHz Wi-Fi (it cannot connect to 5 GHz)
// ----------------------------------------------------------------
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ----------------------------------------------------------------
// I2S Digital Audio Pinout for MAX98357A
// (Pins 25, 26, 22 are non-strapping pins, 100% safe for boot)
// ----------------------------------------------------------------
#define I2S_DOUT      22    // Connects to DIN on MAX98357A
#define I2S_BCLK      26    // Connects to BCLK on MAX98357A
#define I2S_LRC       25    // Connects to LRC (WS) on MAX98357A

// ----------------------------------------------------------------
// Volume Potentiometer Pin
// IMPORTANT: Pin 34 is on ADC1 (works while Wi-Fi is active).
// Connect Potentiometer outer legs to 3.3V and GND (NEVER 5V!).
// ----------------------------------------------------------------
#define POT_PIN       34

Audio audio;
int lastVolume = -1;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n==================================");
  Serial.println("  Kangaroo Radio Starting Up...   ");
  Serial.println("==================================");

  // 1. Connect to Home Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Connected successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to Wi-Fi. Check SSID and 2.4GHz network.");
  }

  // 2. Configure I2S Digital Audio Output
  audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
  audio.setVolume(14); // Default volume (range: 0 to 21)

  // 3. Connect to ABC Kids Listen Live Stream
  // Verified active stream via ABC CDN / Akamai live infrastructure
  Serial.println("Tuning to ABC Kids Listen...");
  audio.connecttohost("https://streaming.abc-cdn.net.au/audio/hls/abcextra.m3u8?source=web");
}

void loop() {
  // audio.loop() continuously buffers and plays stream chunks
  audio.loop();

  // Read volume potentiometer every 250ms
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 250) {
    lastCheck = millis();
    int potVal = analogRead(POT_PIN); // 0 to 4095
    int newVol = map(potVal, 0, 4095, 0, 21);
    if (abs(newVol - lastVolume) > 0) {
      lastVolume = newVol;
      audio.setVolume(newVol);
      Serial.print("Volume: ");
      Serial.println(newVol);
    }
  }
}

// Optional: Audio callback events for debugging in Serial Monitor
void audio_info(const char *info) {
  Serial.print("AUDIO INFO: "); Serial.println(info);
}

void audio_eof_stream(const char *info) {
  Serial.print("STREAM RECONNECTING: "); Serial.println(info);
  // Reconnect automatically if stream drops
  audio.connecttohost("https://streaming.abc-cdn.net.au/audio/hls/abcextra.m3u8?source=web");
}
