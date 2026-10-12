// ================================================================
// Kangaroo Radio — DIY Child-Safe Multi-Station Radio with OLED
// & Magic NFC/RFID Story Token Player (Yoto-Style Tap-to-Play)
// Hardware: ESP32 + MAX98357A I2S DAC Amp + 0.96" I2C Monochrome OLED
//           + RC522 SPI RFID/NFC Reader + 3W Full-Range Speaker
//           + Station Cycle Push Button + 10k Potentiometer
// ================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <SPI.h>
#include <MFRC522.h>
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
#define SCREEN_WIDTH   128
#define SCREEN_HEIGHT  64
#define OLED_RESET     -1     // Reset pin # (or -1 if sharing ESP32 reset)
#define SCREEN_ADDRESS 0x3C   // Common I2C address for 0.96" SSD1306
#define I2C_SDA        21     // ESP32 Hardware I2C SDA
#define I2C_SCL        22     // ESP32 Hardware I2C SCL

// I2S Digital Audio (MAX98357A)
#define I2S_DOUT       27     // DIN on MAX98357A
#define I2S_BCLK       26     // BCLK on MAX98357A
#define I2S_LRC        25     // LRC (WS) on MAX98357A

// SPI RFID/NFC Reader (RC522 / MFRC522)
// Mounted under the top wooden lid for contactless Yoto-style taps!
#define RFID_SS_PIN    5      // SDA / NSS on RC522
#define RFID_RST_PIN   4      // RST on RC522
// Standard ESP32 Hardware VSPI Bus: SCK=18, MISO=19, MOSI=23

// Physical Controls
#define BUTTON_PIN     33     // Station Push Button (to GND; internal pull-up)
#define POT_PIN        34     // 10k Volume Potentiometer (ADC1 channel 6; 3.3V)

// ----------------------------------------------------------------
// 2b. CHILD-SAFE VOLUME SAFETY LIMIT (HEARING PROTECTION GUARD)
// ----------------------------------------------------------------
// 14 / 21 = ~67% max power (~75 dBA safe listening limit, RECOMMENDED)
// Protects toddlers and young children from accidental loud volume spikes!
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

// ----------------------------------------------------------------
// Operating Modes & State Variables
// ----------------------------------------------------------------
enum RadioMode {
  MODE_RADIO,          // Playing curated allow-listed radio stations
  MODE_NFC_READING,    // Card tapped, reading NDEF URL
  MODE_NFC_BUFFERING,  // Downloading / buffering MP3 stream
  MODE_NFC_PLAYING,    // Playing NFC story with live progress bar
  MODE_NFC_DONE,       // Story finished playback
  MODE_NFC_ERROR       // Failed to stream URL or offline
};

RadioMode currentMode = MODE_RADIO;
String currentNfcUrl = "";
String currentStoryTitle = "";
unsigned long nfcDoneStartTime = 0;
unsigned long lastNfcScan = 0;

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
Audio audio;

int lastVolume = -1;
unsigned long lastButtonPress = 0;
unsigned long lastVolOverlayTime = 0;
bool showingVolumeOverlay = false;
bool hasInternet = false;

// ----------------------------------------------------------------
// 4. OLED Display Rendering Routines
// ----------------------------------------------------------------

// Draws the top status bar with safe volume indicator
void drawTopBar(const char* tag, int vol) {
  display.fillRect(0, 0, SCREEN_WIDTH, 11, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(2, 2);
  display.print(tag);

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

  int barWidth = map(progress, 0, 35, 10, 120);
  display.drawRect(4, 45, 120, 10, SSD1306_WHITE);
  display.fillRect(6, 47, barWidth - 4, 6, SSD1306_WHITE);

  display.display();
}

// Display Diagnostic Error Screen
void showErrorScreen(const char* title, const char* line1, const char* line2) {
  display.clearDisplay();
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
  display.println(line2);
  display.display();
}

// Display Playing Station Screen with animated visualizer
void showStationScreen(int stationIdx, int vol, int animTick = 0) {
  display.clearDisplay();
  drawTopBar("WIFI OK", vol);

  display.setTextSize(1);
  display.setCursor(0, 16);
  display.print("STATION [");
  display.print(stationIdx + 1);
  display.print("/");
  display.print(TOTAL_STATIONS);
  display.print("]");

  display.setCursor(0, 28);
  display.print(stations[stationIdx].name);

  display.setCursor(0, 40);
  display.print(stations[stationIdx].genre);

  // Animated Retro Equalizer Bars
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

  display.drawRect(8, 32, 112, 14, SSD1306_WHITE);
  int fillW = map(vol, 0, 21, 0, 108);
  if (fillW > 0) {
    display.fillRect(10, 34, fillW, 10, SSD1306_WHITE);
  }
  int capX = 10 + map(MAX_VOLUME_LIMIT, 0, 21, 0, 108);
  display.drawFastVLine(capX, 30, 18, SSD1306_WHITE);

  display.setCursor(8, 52);
  display.print("Max ~75dBA Ear Guard");
  display.display();
}

// ----------------------------------------------------------------
// 5. NFC Magic Story Display Screens
// ----------------------------------------------------------------

// Screen: NFC Tag Detected & Reading URL
void showNfcReadingScreen() {
  display.clearDisplay();
  drawTopBar("NFC SCANNER", lastVolume >= 0 ? lastVolume : 14);

  display.setTextSize(1);
  display.setCursor(14, 18);
  display.print("[ 🎴 TAG DETECTED ]");

  display.setCursor(8, 34);
  display.print("Reading Story URL...");

  display.setCursor(18, 50);
  display.print("Please hold still");
  display.display();
}

// Screen: Downloading / Buffering Stream
void showNfcBufferingScreen(const char* title, int progress) {
  display.clearDisplay();
  drawTopBar("DOWNLOADING", lastVolume >= 0 ? lastVolume : 14);

  display.setTextSize(1);
  display.setCursor(0, 16);
  display.print("Story Token Tapped:");

  display.setCursor(0, 28);
  display.print(title);

  // Animated downloading progress bar
  int barW = map(progress % 20, 0, 19, 15, 110);
  display.drawRect(6, 42, 116, 9, SSD1306_WHITE);
  display.fillRect(8, 44, barW, 5, SSD1306_WHITE);

  display.setCursor(8, 55);
  display.print("Buffering audio stream...");
  display.display();
}

// Screen: Playing Story with live progress bar, elapsed & remaining time
void showNfcPlayingScreen(const char* title, uint32_t currentSec, uint32_t totalSec, int animTick = 0) {
  display.clearDisplay();
  drawTopBar("STORY TIME", lastVolume >= 0 ? lastVolume : 14);

  // Story Title
  display.setTextSize(1);
  display.setCursor(0, 16);
  display.print("> ");
  display.print(title);

  // Time formatting (MM:SS)
  int curMin = currentSec / 60;
  int curSec = currentSec % 60;
  char timeStr[10];
  snprintf(timeStr, sizeof(timeStr), "%02d:%02d", curMin, curSec);

  char remStr[10] = "--:--";
  int fillWidth = 0;

  if (totalSec > 0 && totalSec >= currentSec) {
    uint32_t remSec = totalSec - currentSec;
    int remMin = remSec / 60;
    int remS = remSec % 60;
    snprintf(remStr, sizeof(remStr), "-%02d:%02d", remMin, remS);
    fillWidth = map(currentSec, 0, totalSec, 0, 112);
    fillWidth = constrain(fillWidth, 0, 112);
  } else {
    // Live stream fallback: breathing activity bar
    fillWidth = (animTick * 6) % 112;
  }

  // Progress Bar
  display.drawRect(6, 28, 116, 8, SSD1306_WHITE);
  if (fillWidth > 0) {
    display.fillRect(8, 30, fillWidth, 4, SSD1306_WHITE);
  }

  // Time stamps
  display.setCursor(6, 40);
  display.print(timeStr);
  display.setCursor(80, 40);
  display.print(remStr);

  // Animated equalizer along the bottom + return prompt
  int barHeights[] = {3, 6, 9, 7, 11, 8, 5, 10, 8, 4, 7, 11, 6, 8, 5, 9};
  for (int i = 0; i < 16; i++) {
    int h = (barHeights[(i + animTick) % 16]);
    display.fillRect(4 + (i * 7), 63 - h, 4, h, SSD1306_WHITE);
  }

  display.display();
}

// Screen: Story Finished / DONE
void showNfcDoneScreen(const char* title) {
  display.clearDisplay();
  display.fillRect(0, 0, SCREEN_WIDTH, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(18, 2);
  display.print("STORY COMPLETE");

  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(16, 20);
  display.print("★ ALL DONE! ★");

  display.setCursor(4, 34);
  display.print(title);

  display.setCursor(0, 50);
  display.print("Press button for Radio");
  display.display();
}

// Screen: NFC Error (404 / Offline / Invalid URL)
void showNfcErrorScreen(const char* errCode, const char* detail) {
  display.clearDisplay();
  display.fillRect(0, 0, SCREEN_WIDTH, 13, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(12, 3);
  display.print("[ ! ] NFC ERROR [ ! ]");

  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 20);
  display.print("Code: ");
  display.print(errCode);

  display.setCursor(0, 34);
  display.print(detail);

  display.setCursor(0, 50);
  display.print("Press btn = Radio");
  display.display();
}

// ----------------------------------------------------------------
// 6. NFC Helper Functions
// ----------------------------------------------------------------

// Extracts a user-friendly story title from a URL filename
String extractTitleFromUrl(String url) {
  int lastSlash = url.lastIndexOf('/');
  String filename = (lastSlash >= 0) ? url.substring(lastSlash + 1) : url;
  int dot = filename.lastIndexOf('.');
  if (dot >= 0) filename = filename.substring(0, dot);
  filename.replace("%20", " ");
  filename.replace("_", " ");
  filename.replace("-", " ");
  if (filename.length() > 0) {
    filename[0] = toupper(filename[0]);
    for (int i = 1; i < filename.length(); i++) {
      if (filename[i - 1] == ' ') filename[i] = toupper(filename[i]);
    }
  }
  return filename.length() > 0 ? filename : "Magic Story";
}

// Decodes NDEF URI record from NTAG213 / NTAG215 / Ultralight tags
String readNfcUrlFromCard() {
  byte buffer[18];
  byte size = sizeof(buffer);
  String fullData = "";

  // Read first 12 user data pages (pages 4 through 15)
  for (byte page = 4; page <= 14; page += 4) {
    MFRC522::StatusCode status = rfid.MIFARE_Read(page, buffer, &size);
    if (status == MFRC522::STATUS_OK) {
      for (byte i = 0; i < 16; i++) {
        fullData += (char)buffer[i];
      }
    } else {
      break;
    }
  }

  // Look for standard URL prefixes
  int httpsIdx = fullData.indexOf("https://");
  int httpIdx = fullData.indexOf("http://");

  if (httpsIdx >= 0) {
    String url = fullData.substring(httpsIdx);
    int endIdx = url.indexOf((char)0xFE);
    if (endIdx > 0) url = url.substring(0, endIdx);
    url.trim();
    for (int i = 0; i < url.length(); i++) {
      if (url[i] < 32 || url[i] > 126) return url.substring(0, i);
    }
    return url;
  } else if (httpIdx >= 0) {
    String url = fullData.substring(httpIdx);
    int endIdx = url.indexOf((char)0xFE);
    if (endIdx > 0) url = url.substring(0, endIdx);
    url.trim();
    for (int i = 0; i < url.length(); i++) {
      if (url[i] < 32 || url[i] > 126) return url.substring(0, i);
    }
    return url;
  }

  // Decode standard NDEF URI identifier codes (0x55 prefix)
  for (int i = 0; i < fullData.length() - 2; i++) {
    if ((byte)fullData[i] == 0x55) { // 'U'
      byte idCode = (byte)fullData[i + 1];
      String prefix = "";
      if (idCode == 0x01) prefix = "http://www.";
      else if (idCode == 0x02) prefix = "https://www.";
      else if (idCode == 0x03) prefix = "http://";
      else if (idCode == 0x04) prefix = "https://";

      if (prefix.length() > 0) {
        String rest = fullData.substring(i + 2);
        for (int k = 0; k < rest.length(); k++) {
          if ((byte)rest[k] == 0xFE || rest[k] < 32 || rest[k] > 126) {
            return prefix + rest.substring(0, k);
          }
        }
        return prefix + rest;
      }
    }
  }

  return "";
}

// ----------------------------------------------------------------
// 7. Station Switcher Function
// ----------------------------------------------------------------
void switchStation(int index) {
  if (index < 0 || index >= TOTAL_STATIONS) return;
  currentStation = index;
  currentMode = MODE_RADIO;

  Serial.println("\n----------------------------------");
  Serial.print(">>> Switching to Station: ");
  Serial.println(stations[currentStation].name);
  Serial.print(">>> Genre: ");
  Serial.println(stations[currentStation].genre);
  Serial.println("----------------------------------");

  showStationScreen(currentStation, lastVolume >= 0 ? lastVolume : 14);
  audio.connecttohost(stations[currentStation].url);
}

// ----------------------------------------------------------------
// 8. Setup Routine
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

  // Initialize Hardware SPI Bus & RC522 RFID/NFC Reader
  SPI.begin(); // Standard ESP32 VSPI: SCK=18, MISO=19, MOSI=23
  rfid.PCD_Init();
  delay(50);
  byte v = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  if (v == 0x00 || v == 0xFF) {
    Serial.println("RC522 RFID reader not detected! Check wiring (SS=5, RST=4).");
  } else {
    Serial.print("RC522 RFID reader initialized successfully! Version: 0x");
    Serial.println(v, HEX);
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

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Connected successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    hasInternet = true;
  } else {
    wl_status_t status = WiFi.status();
    Serial.println("\nWi-Fi connection failed!");
    if (status == WL_NO_SSID_AVAIL) {
      char msg[32];
      snprintf(msg, sizeof(msg), "\"%s\" not found", ssid);
      showErrorScreen("SSID NOT FOUND", msg, "Check router 2.4GHz");
    } else if (status == WL_CONNECT_FAILED) {
      char msg[32];
      snprintf(msg, sizeof(msg), "Wrong password for:");
      showErrorScreen("WRONG PASSWORD", msg, ssid);
    } else {
      showErrorScreen("WIFI NOT FOUND", "Check SSID & router", ssid);
    }
    while (WiFi.status() != WL_CONNECTED) {
      delay(1000);
    }
  }

  // Configure MAX98357A I2S Digital Audio Output
  audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);

  // Read initial potentiometer position with Child-Safe Cap
  int initialPot = analogRead(POT_PIN);
  lastVolume = map(initialPot, 0, 4095, 0, MAX_VOLUME_LIMIT);
  audio.setVolume(lastVolume);

  // Connect to default station (ABC Kids listen)
  switchStation(currentStation);
}

// ----------------------------------------------------------------
// 9. Main Loop
// ----------------------------------------------------------------
void loop() {
  // Feed audio decoder buffer continuously
  audio.loop();

  // 1. Station Cycle Push Button (Debounced)
  if (digitalRead(BUTTON_PIN) == LOW) {
    if (millis() - lastButtonPress > 450) { // 450ms debounce
      lastButtonPress = millis();

      if (currentMode != MODE_RADIO) {
        // Exiting NFC Story mode -> Smoothly return to curated Radio Stations!
        Serial.println("Push button pressed: Exiting NFC Story -> Resuming Radio Stations.");
        switchStation(currentStation);
      } else {
        // Normal radio cycling
        int next = (currentStation + 1) % TOTAL_STATIONS;
        switchStation(next);
      }
    }
  }

  // 2. Poll for NFC / RFID Story Cards every 250ms
  if (millis() - lastNfcScan > 250) {
    lastNfcScan = millis();

    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      Serial.println("\n[🎴 NFC Tag Detected]");
      showNfcReadingScreen();

      String extractedUrl = readNfcUrlFromCard();
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();

      if (extractedUrl.length() > 0 && (extractedUrl.startsWith("http://") || extractedUrl.startsWith("https://"))) {
        currentNfcUrl = extractedUrl;
        currentStoryTitle = extractTitleFromUrl(currentNfcUrl);
        currentMode = MODE_NFC_BUFFERING;

        Serial.print(">>> Story Title: "); Serial.println(currentStoryTitle);
        Serial.print(">>> Streaming MP3 URL: "); Serial.println(currentNfcUrl);

        showNfcBufferingScreen(currentStoryTitle.c_str(), 5);
        audio.connecttohost(currentNfcUrl.c_str());
        currentMode = MODE_NFC_PLAYING;
      } else {
        Serial.println(">>> NFC Card did not contain a valid http/https MP3 URL!");
        showNfcErrorScreen("NO URL", "Write MP3 URL on tag");
        delay(2000);
        if (currentMode == MODE_RADIO) {
          showStationScreen(currentStation, lastVolume);
        }
      }
    }
  }

  // 3. Volume Potentiometer Polling every 200ms with Child-Safe Cap
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

  // 4. Clear Volume Overlay after 1.8 seconds and return to Active Screen
  if (showingVolumeOverlay && (millis() - lastVolOverlayTime > 1800)) {
    showingVolumeOverlay = false;
    if (currentMode == MODE_RADIO) {
      showStationScreen(currentStation, lastVolume);
    }
  }

  // 5. Update Screen (Radio Equalizer OR NFC Story Progress Bar)
  static unsigned long lastScreenTick = 0;
  static int animCounter = 0;
  if (!showingVolumeOverlay && (millis() - lastScreenTick > 300)) {
    lastScreenTick = millis();
    animCounter++;

    if (currentMode == MODE_RADIO) {
      showStationScreen(currentStation, lastVolume, animCounter);
    } else if (currentMode == MODE_NFC_PLAYING) {
      uint32_t curSec = audio.getAudioCurrentTime();
      uint32_t totSec = audio.getAudioFileDuration();
      showNfcPlayingScreen(currentStoryTitle.c_str(), curSec, totSec, animCounter);
    } else if (currentMode == MODE_NFC_DONE) {
      // Auto-return to radio after 4 seconds
      if (millis() - nfcDoneStartTime > 4000) {
        Serial.println("Story DONE timeout: Resuming Radio Stations.");
        switchStation(currentStation);
      }
    }
  }
}

// ----------------------------------------------------------------
// 10. Stream & Audio Callbacks
// ----------------------------------------------------------------
void audio_info(const char *info) {
  Serial.print("AUDIO: "); Serial.println(info);
}

// Called when an MP3 finishes playing to the end!
void audio_eof_mp3(const char *info) {
  Serial.print("MP3 FINISHED PLAYBACK: "); Serial.println(info);
  if (currentMode == MODE_NFC_PLAYING) {
    currentMode = MODE_NFC_DONE;
    nfcDoneStartTime = millis();
    showNfcDoneScreen(currentStoryTitle.c_str());
  }
}

void audio_eof_stream(const char *info) {
  Serial.print("STREAM DISCONNECTED: "); Serial.println(info);
  if (currentMode == MODE_RADIO) {
    showErrorScreen("NO INTERNET", "Stream lost/offline", "Reconnecting...");
    delay(1500);
    audio.connecttohost(stations[currentStation].url);
  } else if (currentMode == MODE_NFC_PLAYING) {
    // If stream reached end or disconnected
    currentMode = MODE_NFC_DONE;
    nfcDoneStartTime = millis();
    showNfcDoneScreen(currentStoryTitle.c_str());
  }
}
