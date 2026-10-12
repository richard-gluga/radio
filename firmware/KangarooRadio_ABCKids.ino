// ================================================================
// Kangaroo Radio — DIY Child-Safe Multi-Station Radio with OLED
// Hardware: ESP32 + MAX98357A I2S DAC Amp + 0.96" I2C Monochrome OLED
//           + 3W Full-Range Speaker + Station Cycle Push Button + 10k Pot
// Display:  0.96" SSD1306 I2C OLED (128x64) showing Wi-Fi status,
//           diagnostics ("Not found", "Wrong password", "No internet"),
//           station names, volume bar, and live equalizer bars!
// ================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "Audio.h"

// ----------------------------------------------------------------
// 1. CONFIGURATION: Set your 2.4 GHz Wi-Fi credentials
// ----------------------------------------------------------------
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ----------------------------------------------------------------
// 2. Hardware Pinout Definitions
// ----------------------------------------------------------------
// I2C Monochrome OLED Display (SSD1306 128x64)
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1     // Reset pin # (or -1 if sharing ESP32 reset)
#define SCREEN_ADDRESS 0x3C  // Common I2C address for 0.96" SSD1306
#define I2C_SDA       21     // ESP32 Hardware I2C SDA
#define I2C_SCL       22     // ESP32 Hardware I2C SCL

// I2S Digital Audio (MAX98357A)
#define I2S_DOUT      27     // DIN on MAX98357A (moved from 22 to free I2C SCL)
#define I2S_BCLK      26     // BCLK on MAX98357A
#define I2S_LRC       25     // LRC (WS) on MAX98357A

// Physical Controls
#define BUTTON_PIN    33     // Station Push Button (to GND; uses internal pull-up)
#define POT_PIN       34     // 10k Volume Potentiometer (ADC1 channel 6; 3.3V reference)

// ----------------------------------------------------------------
// 2b. CHILD-SAFE VOLUME SAFETY LIMIT (HEARING PROTECTION GUARD)
// ----------------------------------------------------------------
// The MAX98357A I2S amplifier outputs up to 3.2W into a 4-ohm speaker.
// At uncapped full volume (level 21), audio close-up can exceed 90-95 dBA,
// which is far too loud for toddler and young child ears!
//
// Setting MAX_VOLUME_LIMIT caps the maximum sound level in software:
//   14 / 21 = ~67% max power (~75 dBA safe listening limit, RECOMMENDED)
//   11 / 21 = ~50% max power (~68 dBA gentle nursery/bedtime)
//   17 / 21 = ~80% max power (~82 dBA outdoor/picnic use)
//   21 / 21 = 100% uncapped max power (92+ dBA, adult use only)
//
// This scales the full physical rotation of the 10k knob smoothly from 0 to MAX_VOLUME_LIMIT,
// so kids can twist the knob all the way without hurting their ears!
#define MAX_VOLUME_LIMIT  14

// ----------------------------------------------------------------
// 3. Curated Child-Safe Station Allow-List
// ----------------------------------------------------------------
struct Station {
  const char* name;
  const char* genre;
  const char* url;
};

const Station stations[] = {
  {
    "ABC Kids listen",
    "Preschool & Aussie Stories",
    "https://streaming.abc-cdn.net.au/audio/hls/abcextra.m3u8?source=web"
  },
  {
    "Fun Kids UK",
    "Pop, Stories & Quizzes",
    "https://listen-funkids.sharp-stream.com/funkids.mp3"
  },
  {
    "Fun Kids Junior",
    "Gentle Nursery Rhymes (0-4)",
    "http://listen-funkids.sharp-stream.com/funkidsjunior.mp3"
  },
  {
    "Rock the Cradle",
    "Indie Music for Families",
    "http://rockthecradle.stream.publicradio.org/rockthecradle.mp3"
  },
  {
    "Positively Sleep",
    "Calm Lullabies & Ambient",
    "https://streaming.positivity.radio/pr/sleepkids/icecast.audio"
  },
  {
    "ABC Classic",
    "Peaceful Classical for Play",
    "https://streaming.abc-cdn.net.au/audio/hls/classicfmnsw.m3u8?source=web"
  }
};

const int TOTAL_STATIONS = sizeof(stations) / sizeof(stations[0]);
int currentStation = 0; // Default: ABC Kids listen

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
Audio audio;

int lastVolume = -1;
unsigned long lastButtonPress = 0;
unsigned long lastVolOverlayTime = 0;
bool showingVolumeOverlay = false;
bool hasInternet = false;

// ----------------------------------------------------------------
// 4. OLED Display Rendering Routines
// ----------------------------------------------------------------

// Draws the top status bar
void drawTopBar(const char* tag, int vol) {
  display.fillRect(0, 0, SCREEN_WIDTH, 11, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(2, 2);
  display.print(tag);

  // Volume badge on right with kid-safe ceiling indicator
  display.setCursor(74, 2);
  display.print("SAFE:");
  display.print(map(vol, 0, MAX_VOLUME_LIMIT, 0, 100));
  display.print("%");
  display.setTextColor(SSD1306_WHITE);
}

// Display Connecting Screen
void showConnectingScreen(const char* targetSsid, int progress) {
  display.clearDisplay();
  drawTopBar("KANGAROO RADIO", 14);

  display.setTextSize(1);
  display.setCursor(0, 18);
  display.print("Connecting to Wi-Fi");

  display.setCursor(0, 30);
  display.print("SSID: ");
  display.print(targetSsid);

  // Progress Bar
  int barWidth = map(progress, 0, 35, 10, 120);
  display.drawRect(4, 45, 120, 10, SSD1306_WHITE);
  display.fillRect(6, 47, barWidth - 4, 6, SSD1306_WHITE);

  display.display();
}

// Display Specific Diagnostic Error Screen
void showErrorScreen(const char* title, const char* line1, const char* line2) {
  display.clearDisplay();
  
  // Inverse Alert Bar
  display.fillRect(0, 0, SCREEN_WIDTH, 13, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(14, 3);
  display.print("[ ! ] ERROR [ ! ]");
  
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 20);
  display.print("Reason: ");
  display.println(title);

  display.setCursor(0, 34);
  display.println(line1);

  display.setCursor(0, 48);
  display.setTextColor(SSD1306_WHITE);
  display.println(line2);

  display.display();
}

// Display Playing Station Screen with animated visualizer
void showStationScreen(int stationIdx, int vol, int animTick = 0) {
  display.clearDisplay();
  drawTopBar("WIFI OK", vol);

  // Station Title (Prominent)
  display.setTextSize(1);
  display.setCursor(0, 16);
  display.print("STATION [");
  display.print(stationIdx + 1);
  display.print("/");
  display.print(TOTAL_STATIONS);
  display.print("]");

  // Station Name (Bold / Size 1 or 2 depending on length)
  display.setTextSize(1);
  display.setCursor(0, 28);
  display.print(stations[stationIdx].name);

  // Genre / Description
  display.setCursor(0, 40);
  display.print(stations[stationIdx].genre);

  // Animated Retro Equalizer Bars along the bottom
  int barHeights[] = {4, 7, 11, 8, 13, 9, 6, 12, 10, 5, 8, 14, 7, 10, 6, 12};
  int totalBars = 16;
  int startX = 4;
  for (int i = 0; i < totalBars; i++) {
    int h = (barHeights[(i + animTick) % totalBars]);
    display.fillRect(startX + (i * 7), 63 - h, 4, h, SSD1306_WHITE);
  }

  display.display();
}

// Display Quick Volume Slider Overlay with Child-Safe Ceiling
void showVolumeOverlay(int vol) {
  display.clearDisplay();
  display.fillRect(0, 0, SCREEN_WIDTH, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(8, 2);
  display.print("VOLUME [KIDS SAFE]");

  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(10, 18);
  display.print("Safe Cap: ");
  display.print(vol);
  display.print("/");
  display.print(MAX_VOLUME_LIMIT);
  display.print(" (");
  display.print(map(vol, 0, MAX_VOLUME_LIMIT, 0, 100));
  display.print("%)");

  // Volume Bar with Safety Ceiling Marker
  display.drawRect(8, 32, 112, 14, SSD1306_WHITE);
  int fillW = map(vol, 0, 21, 0, 108); // showing position relative to hardware max (21)
  if (fillW > 0) {
    display.fillRect(10, 34, fillW, 10, SSD1306_WHITE);
  }
  // Draw vertical safety cap marker line on the hardware bar
  int capX = 10 + map(MAX_VOLUME_LIMIT, 0, 21, 0, 108);
  display.drawFastVLine(capX, 30, 18, SSD1306_WHITE);

  display.setCursor(8, 52);
  display.print("Max ~75dBA Ear Guard");
  display.display();
}

// ----------------------------------------------------------------
// 5. Station Switcher Function
// ----------------------------------------------------------------
void switchStation(int index) {
  if (index < 0 || index >= TOTAL_STATIONS) return;
  currentStation = index;

  Serial.println("\n----------------------------------");
  Serial.print(">>> Switching to Station: ");
  Serial.println(stations[currentStation].name);
  Serial.print(">>> Genre: ");
  Serial.println(stations[currentStation].genre);
  Serial.println("----------------------------------");

  showStationScreen(currentStation, lastVolume >= 0 ? lastVolume : 14);

  // Connect to the new live stream
  audio.connecttohost(stations[currentStation].url);
}

// ----------------------------------------------------------------
// 6. Setup Routine
// ----------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(300);

  // Configure Station Cycle Push Button (Pin to GND, internal pullup)
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Initialize I2C and Monochrome OLED Display
  Wire.begin(I2C_SDA, I2C_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println("SSD1306 OLED initialization failed! Check wiring (SDA=21, SCL=22).");
  } else {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(10, 18);
    display.println("KANGAROO RADIO");
    display.setCursor(10, 32);
    display.println("Starting up...");
    display.display();
    delay(800);
  }

  // Connect to 2.4 GHz Wi-Fi with live diagnostic feedback
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 35) {
    delay(350);
    Serial.print(".");
    showConnectingScreen(ssid, attempts);
    attempts++;
  }

  // Diagnose connection result
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Connected successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    hasInternet = true;
  } else {
    wl_status_t status = WiFi.status();
    Serial.println("\nWi-Fi connection failed!");
    
    // Check specific failure cause
    if (status == WL_NO_SSID_AVAIL) {
      char msg[32];
      snprintf(msg, sizeof(msg), "\"%s\" not found", ssid);
      showErrorScreen("SSID NOT FOUND", msg, "Check router 2.4GHz");
    } else if (status == WL_CONNECT_FAILED) {
      char msg[32];
      snprintf(msg, sizeof(msg), "Wrong password for:");
      showErrorScreen("WRONG PASSWORD", msg, ssid);
    } else {
      // Perform quick network scan to diagnose if SSID is in range
      int n = WiFi.scanNetworks();
      bool found = false;
      for (int i = 0; i < n; i++) {
        if (WiFi.SSID(i) == ssid) {
          found = true;
          break;
        }
      }
      if (!found) {
        char msg[32];
        snprintf(msg, sizeof(msg), "\"%s\" not found", ssid);
        showErrorScreen("WIFI NOT FOUND", msg, "Check 2.4GHz name");
      } else {
        showErrorScreen("WRONG PASSWORD", "Auth failed on:", ssid);
      }
    }
    // Halt with error screen visible so user can read what went wrong
    while (WiFi.status() != WL_CONNECTED) {
      delay(1000);
    }
  }

  // Configure MAX98357A I2S Digital Audio Output
  audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
  
  // Read initial potentiometer position for startup volume with child-safe cap
  int initialPot = analogRead(POT_PIN);
  lastVolume = map(initialPot, 0, 4095, 0, MAX_VOLUME_LIMIT);
  audio.setVolume(lastVolume);

  // Connect to default station (ABC Kids listen)
  switchStation(currentStation);
}

// ----------------------------------------------------------------
// 7. Main Loop
// ----------------------------------------------------------------
void loop() {
  // Feed audio decoder buffer continuously
  audio.loop();

  // 1. Station Cycle Push Button (Debounced)
  if (digitalRead(BUTTON_PIN) == LOW) {
    if (millis() - lastButtonPress > 450) { // 450ms debounce
      lastButtonPress = millis();
      int next = (currentStation + 1) % TOTAL_STATIONS;
      switchStation(next);
    }
  }

  // 2. Volume Potentiometer Polling every 200ms with Child-Safe Cap
  static unsigned long lastPotCheck = 0;
  if (millis() - lastPotCheck > 200) {
    lastPotCheck = millis();
    int potVal = analogRead(POT_PIN); // 0 to 4095
    int newVol = map(potVal, 0, 4095, 0, MAX_VOLUME_LIMIT);

    if (abs(newVol - lastVolume) > 0) {
      lastVolume = newVol;
      audio.setVolume(newVol);
      showingVolumeOverlay = true;
      lastVolOverlayTime = millis();
      showVolumeOverlay(newVol);
    }
  }

  // 3. Clear Volume Overlay after 1.8 seconds and return to Station Screen
  if (showingVolumeOverlay && (millis() - lastVolOverlayTime > 1800)) {
    showingVolumeOverlay = false;
    showStationScreen(currentStation, lastVolume);
  }

  // 4. Update Animated Equalizer on OLED every 250ms while playing
  static unsigned long lastAnimTick = 0;
  static int animCounter = 0;
  if (!showingVolumeOverlay && (millis() - lastAnimTick > 250)) {
    lastAnimTick = millis();
    animCounter++;
    showStationScreen(currentStation, lastVolume, animCounter);
  }
}

// ----------------------------------------------------------------
// 8. Stream Diagnostic Callbacks
// ----------------------------------------------------------------
void audio_info(const char *info) {
  Serial.print("AUDIO: "); Serial.println(info);
}

void audio_eof_stream(const char *info) {
  Serial.print("STREAM DISCONNECTED: "); Serial.println(info);
  // If disconnected or stream offline, show error briefly then retry
  showErrorScreen("NO INTERNET", "Stream lost/offline", "Reconnecting...");
  delay(1500);
  audio.connecttohost(stations[currentStation].url);
}
