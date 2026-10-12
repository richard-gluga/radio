// ================================================================
// Kangaroo Radio — DIY Child-Safe Multi-Station Radio
// Hardware: ESP32 + MAX98357A I2S DAC Amp + 3W Speaker + Station Button
// Target: Curated Child-Safe Live Streams (ABC Kids, Fun Kids, Lullabies)
// ================================================================

#include <Arduino.h>
#include <WiFi.h>
#include "Audio.h"

// ----------------------------------------------------------------
// CONFIGURATION: Set your 2.4 GHz Wi-Fi credentials
// ----------------------------------------------------------------
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ----------------------------------------------------------------
// Hardware Pinout Definitions
// ----------------------------------------------------------------
// I2S Digital Audio (MAX98357A)
#define I2S_DOUT      22    // DIN on MAX98357A
#define I2S_BCLK      26    // BCLK on MAX98357A
#define I2S_LRC       25    // LRC (WS) on MAX98357A

// Controls
#define BUTTON_PIN    33    // Station Cycle Button (Button to GND; uses INPUT_PULLUP)
#define POT_PIN       34    // Volume Potentiometer (ADC1 channel 6; 3.3V reference)

// ----------------------------------------------------------------
// Curated Child-Safe Station Allow-List
// ----------------------------------------------------------------
struct Station {
  const char* name;
  const char* genre;
  const char* url;
};

const Station stations[] = {
  {
    "ABC Kids listen (Australia)",
    "Preschool Stories, Play School & Aussie Music",
    "https://streaming.abc-cdn.net.au/audio/hls/abcextra.m3u8?source=web"
  },
  {
    "Fun Kids UK (Live)",
    "Children's Pop, Stories & Family Entertainment",
    "https://listen-funkids.sharp-stream.com/funkids.mp3"
  },
  {
    "Fun Kids Junior (Toddlers)",
    "Gentle Nursery Rhymes & Songs (Ages 0-5)",
    "http://listen-funkids.sharp-stream.com/funkidsjunior.mp3"
  },
  {
    "Rock the Cradle (MPR Kids)",
    "Commercial-Free Public Radio for Kids & Grown-Ups",
    "http://rockthecradle.stream.publicradio.org/rockthecradle.mp3"
  },
  {
    "Positively Sleep Kids",
    "Bedtime Lullabies, Ambient Calm & Sleep Music",
    "https://streaming.positivity.radio/pr/sleepkids/icecast.audio"
  },
  {
    "ABC Classic (Calm / Reading)",
    "Peaceful Classical Music for Quiet Play & Craft",
    "https://streaming.abc-cdn.net.au/audio/hls/classicfmnsw.m3u8?source=web"
  }
};

const int TOTAL_STATIONS = sizeof(stations) / sizeof(stations[0]);
int currentStation = 0; // Starts with ABC Kids listen

Audio audio;
int lastVolume = -1;
unsigned long lastButtonPress = 0;

void switchStation(int index) {
  if (index < 0 || index >= TOTAL_STATIONS) return;
  currentStation = index;

  Serial.println("\n----------------------------------");
  Serial.print(">>> Switching to Station: ");
  Serial.println(stations[currentStation].name);
  Serial.print(">>> Genre: ");
  Serial.println(stations[currentStation].genre);
  Serial.println("----------------------------------");

  // Connect to the new live stream
  audio.connecttohost(stations[currentStation].url);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n==================================");
  Serial.println("  Kangaroo Radio Starting Up...   ");
  Serial.println("==================================");

  // Configure Station Cycle Button with Internal Pull-up
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // 1. Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 35) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Connected successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWi-Fi connection failed. Please check SSID and password.");
  }

  // 2. Configure I2S Digital Audio Output
  audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
  audio.setVolume(14); // Default volume (0 to 21)

  // 3. Connect to default station (ABC Kids listen)
  switchStation(currentStation);
}

void loop() {
  // Keeps stream buffer fed smoothly
  audio.loop();

  // 1. Check Station Cycle Push Button (Debounced)
  if (digitalRead(BUTTON_PIN) == LOW) {
    if (millis() - lastButtonPress > 450) { // 450ms debounce
      lastButtonPress = millis();
      int next = (currentStation + 1) % TOTAL_STATIONS;
      switchStation(next);
    }
  }

  // 2. Check Volume Potentiometer every 250ms
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

// Optional audio callback events
void audio_info(const char *info) {
  Serial.print("AUDIO: "); Serial.println(info);
}

void audio_eof_stream(const char *info) {
  Serial.print("STREAM RECONNECT: "); Serial.println(info);
  // Auto-reconnect to current station
  audio.connecttohost(stations[currentStation].url);
}
