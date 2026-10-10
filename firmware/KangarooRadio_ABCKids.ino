// Kangaroo Radio — DIY ABC Kids Radio
// Hardware: ESP32 + MAX98357A I2S DAC Amp + 3W Speaker
// Target: ABC Kids Listen (Australian Broadcasting Corporation)
// Sydney, Australia

#include <Arduino.h>
#include <WiFi.h>
#include "Audio.h"

// ================================================================
// CONFIGURATION: Set your 2.4 GHz Wi-Fi details here
// ================================================================
const char* ssid     = "YOUR_WIFI_SSID";        // Must be 2.4 GHz
const char* password = "YOUR_WIFI_PASSWORD";

// I2S Digital Audio Pinout for MAX98357A
#define I2S_DOUT      22    // Connects to DIN on MAX98357A
#define I2S_BCLK      26    // Connects to BCLK on MAX98357A
#define I2S_LRC       25    // Connects to LRC (WS) on MAX98357A

// Optional: Hardware Volume Potentiometer Pin
#define POT_PIN       34    // Connects to Center Pin of 10k Pot

Audio audio;
int lastVolume = -1;

void setup() {
  Serial.begin(115200);
  Serial.println("\n==================================");
  Serial.println("  Kangaroo Radio Starting Up...   ");
  Serial.println("==================================");

  // 1. Connect to Home Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Connected successfully!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // 2. Configure Digital Audio Output
  audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
  audio.setVolume(14); // Default volume (range: 0 to 21)

  // 3. Connect directly to ABC Kids Listen Live Stream
  Serial.println("Tuning to ABC Kids Listen...");
  audio.connecttohost("http://live-radio01.mediahubaustralia.com/XTDW/mp3/");
}

void loop() {
  // Keeps audio buffer filled smoothly
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
