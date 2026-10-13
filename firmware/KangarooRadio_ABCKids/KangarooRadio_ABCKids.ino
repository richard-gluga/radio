// Kangaroo Radio: DFR1139 / ESP32-audioI2S 4.0.0. See README before wiring.
// Audio operations have one owner task. UI and NFC never call Audio methods.
#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Audio.h>
#include <atomic>
#include "RadioConfig.h"
#include "Hardware.h"
#include "Stations.h"
#include "NdefUri.h"
#include "RadioLogic.h"

static_assert(MAX_VOLUME <= 21, "MAX_VOLUME must be 0..21");
static_assert(START_STATION < STATION_COUNT, "START_STATION is outside the station list");

enum class Playback : uint8_t { Idle, Connecting, Buffering, Playing, Ended, Error, Fatal };
struct Command { uint32_t id; bool story; char url[256]; };
struct Status { uint32_t id; Playback state; uint32_t seconds, duration; char detail[48]; };
QueueHandle_t commands = nullptr, statuses = nullptr;
std::atomic<int> desiredVolume{0};
std::atomic<bool> decoderReady{false}, reachedEof{false};
Adafruit_SSD1306 display(128, 64, &Wire, -1);
MFRC522 reader(PIN_RFID_CS, PIN_RFID_RST);
radio::Button stationButton;
radio::Volume knob;
bool displayOk = false, readerOk = false, fatal = false, storyMode = false;
bool networkWasUp = false;
unsigned stationIndex = START_STATION, wifiIndex = 0, failures = 0, buttonCount = 0;
uint32_t requestId = 0, wifiStarted = 0, wifiRetryAt = 0, lastUi = 0, lastNfc = 0;
uint32_t lastKnob = 0, lastDiagnostic = 0, retryStarted = 0, completedAt = 0, toastStarted = 0;
bool wifiAttempt = false, retryPending = false, completionPending = false;
char storyUrl[256] = {}, storyTitle[64] = {}, toast[32] = {};
Status current{0, Playback::Idle, 0, 0, "Starting"};

void textLine(int y, const char* value) {
  if (!displayOk) return;
  // The built-in font fits 21 ASCII characters at size 1. No wrapping/emoji.
  char line[22];
  size_t n = 0;
  while (n < 21 && value[n]) {
    const uint8_t c = uint8_t(value[n]);
    line[n] = c >= 32 && c < 127 ? char(c) : '?';
    ++n;
  }
  line[n] = 0;
  display.setCursor(0, y);
  display.print(line);
}

void toastMessage(const char* value) {
  snprintf(toast, sizeof(toast), "%s", value);
  toastStarted = millis();
  Serial.println(value);
}

void audioWorker(void*) {
  Audio::audio_info_callback = [](Audio::msg_t event) {
    if (event.e == Audio::evt_eof) reachedEof.store(true);
    if (event.e == Audio::evt_info && event.msg && strstr(event.msg, "stream ready"))
      decoderReady.store(true);
    // No display, reconnects or delays inside callbacks.
    if ((event.e == Audio::evt_info || event.e == Audio::evt_log) && event.msg)
      Serial.printf("AUDIO: %s\n", event.msg);
  };
  Audio audio;
  Status status{0, Playback::Idle, 0, 0, "Ready"};
  if (!audio.setPinout(PIN_I2S_BCLK, PIN_I2S_LRC, PIN_I2S_DOUT)) {
    status.state = Playback::Fatal;
    snprintf(status.detail, sizeof(status.detail), "Audio init: PSRAM/settings");
    xQueueOverwrite(statuses, &status);
    vTaskDelete(nullptr);
    return;
  }
  audio.forceMono(true);
  audio.setConnectionTimeout(2500, 4000);
  audio.setVolume(0);
  Command command{};
  bool active = false, isStory = false;
  uint32_t connectedAt = 0, lastProgressAt = 0, lastReport = 0, previousSecond = 0;
  int appliedVolume = -1;
  for (;;) {
    if (xQueueReceive(commands, &command, 0) == pdTRUE) {
      active = false;
      audio.stopSong();
      audio.loop(); // Drain queued callbacks from the old source while stopped.
      decoderReady.store(false);
      reachedEof.store(false);
      status = {command.id, Playback::Idle, 0, 0, "Stopped"};
      isStory = command.story;
      if (command.url[0]) {
        status.state = Playback::Connecting;
        snprintf(status.detail, sizeof(status.detail), "Connecting to audio");
        xQueueOverwrite(statuses, &status);
        // Clamp before connecting: there is no independent startup volume.
        appliedVolume = constrain(desiredVolume.load(), 0, int(MAX_VOLUME));
        audio.setVolume(appliedVolume);
        const bool accepted = WiFi.status() == WL_CONNECTED && audio.connecttohost(command.url);
        // Another button/tag may have replaced this request while DNS/TLS blocked.
        if (uxQueueMessagesWaiting(commands)) continue;
        status.state = accepted ? Playback::Buffering : Playback::Error;
        snprintf(status.detail, sizeof(status.detail), "%s", accepted ? "Waiting for decoder" : "Connection failed");
        active = accepted;
        connectedAt = lastProgressAt = millis();
        previousSecond = 0;
      }
      xQueueOverwrite(statuses, &status);
    }
    const int volume = constrain(desiredVolume.load(), 0, int(MAX_VOLUME));
    if (appliedVolume != volume) { audio.setVolume(volume); appliedVolume = volume; }
    if (active) {
      audio.loop();
      // 4.0.0 queues EOF during loop(), then stops. Deliver that queued event
      // before classifying !isRunning() as an error or abandoning this source.
      if (!audio.isRunning()) audio.loop();
      const uint32_t now = millis();
      // EOF is processed before the library's reset duration/current-time values.
      if (reachedEof.exchange(false)) {
        active = false;
        const auto end = radio::classifyEnd(isStory, decoderReady.load() || status.seconds > 0,
                                            status.seconds, status.duration);
        if (end == radio::EndResult::Ended) {
          status.state = Playback::Ended;
          snprintf(status.detail, sizeof(status.detail), "%s", status.duration ? "End of audio" : "End; length unknown");
        } else {
          status.state = Playback::Error;
          snprintf(status.detail, sizeof(status.detail), "%s",
                   end == radio::EndResult::StationLost ? "Station disconnected" :
                   end == radio::EndResult::NeverStarted ? "Audio did not start" : "Audio ended early");
        }
        audio.stopSong();
      } else if (WiFi.status() != WL_CONNECTED || !audio.isRunning()) {
        active = false;
        status.state = Playback::Error;
        snprintf(status.detail, sizeof(status.detail), "Network/decoder stopped");
        audio.stopSong();
      } else {
        status.seconds = audio.getAudioCurrentTime();
        status.duration = audio.getAudioFileDuration();
        if (decoderReady.load() || status.seconds > 0) {
          status.state = Playback::Playing;
          snprintf(status.detail, sizeof(status.detail), "Playing");
        }
        if (status.seconds != previousSecond) {
          previousSecond = status.seconds;
          lastProgressAt = now;
        }
        if ((status.state != Playback::Playing && radio::elapsed(now, connectedAt, 20000)) ||
            (status.state == Playback::Playing && radio::elapsed(now, lastProgressAt, 30000))) {
          active = false;
          status.state = Playback::Error;
          snprintf(status.detail, sizeof(status.detail), "Audio stalled / timeout");
          audio.stopSong();
        }
      }
    }
    if (radio::elapsed(millis(), lastReport, 100)) {
      lastReport = millis();
      xQueueOverwrite(statuses, &status);
    }
    vTaskDelay(pdMS_TO_TICKS(2));
  }
}

void requestPlayback(bool stop = false) {
  if (HARDWARE_TEST || fatal || !commands) return;
  Command next{};
  next.id = ++requestId;
  next.story = storyMode;
  if (!stop) snprintf(next.url, sizeof(next.url), "%s", storyMode ? storyUrl : STATIONS[stationIndex].url);
  current = {requestId, stop ? Playback::Idle : Playback::Connecting, 0, 0, "Waiting for audio"};
  retryPending = completionPending = false;
  xQueueOverwrite(commands, &next); // Latest selection wins, including while connecting.
}

void selectRadio(bool advance) {
  if (advance) stationIndex = (stationIndex + 1) % STATION_COUNT;
  storyMode = false;
  failures = 0;
  requestPlayback(WiFi.status() != WL_CONNECTED);
}

void beginNetwork(unsigned index) {
  wifiIndex = index;
  wifiStarted = millis();
  wifiAttempt = true;
  const char* ssid = index ? BACKUP_WIFI_SSID : WIFI_SSID;
  const char* password = index ? BACKUP_WIFI_PASSWORD : WIFI_PASSWORD;
  Serial.printf("WIFI: trying %s network\n", index ? "backup" : "home");
  WiFi.disconnect(false, false);
  WiFi.begin(ssid, password);
}

void pollNetwork() {
  const uint32_t now = millis();
  const bool up = WiFi.status() == WL_CONNECTED;
  if (up && !networkWasUp) {
    networkWasUp = true;
    wifiAttempt = false;
    Serial.printf("WIFI: connected; IP %s\n", WiFi.localIP().toString().c_str());
    requestPlayback();
  } else if (!up && networkWasUp) {
    networkWasUp = false;
    wifiRetryAt = now;
    wifiAttempt = false;
    requestPlayback(true);
    toastMessage("Wi-Fi lost; retrying");
  }
  if (up) return;
  if (wifiAttempt && radio::elapsed(now, wifiStarted, 12000)) {
    if (!wifiIndex && BACKUP_WIFI_SSID[0]) beginNetwork(1);
    else {
      wifiAttempt = false;
      wifiRetryAt = now;
      WiFi.disconnect(false, false);
      toastMessage("Check Wi-Fi settings");
    }
  } else if (!wifiAttempt && radio::elapsed(now, wifiRetryAt, 5000)) beginNetwork(0);
}

bool readTagUrl(char* output, size_t capacity, const char*& error) {
  if (MFRC522::PICC_GetType(reader.uid.sak) != MFRC522::PICC_TYPE_MIFARE_UL) {
    error = "Use NTAG213/215";
    return false;
  }
  uint8_t block[18], size = sizeof(block);
  if (reader.MIFARE_Read(3, block, &size) != MFRC522::STATUS_OK) {
    error = "Tag read failed";
    return false;
  }
  // Page 3 is the Type 2 Capability Container: magic/version/capacity/access.
  if (block[0] != 0xE1 || (block[1] >> 4) != 1 || (block[3] >> 4) != 0) {
    error = "Format tag as NDEF";
    return false;
  }
  const size_t bytes = size_t(block[2]) * 8;
  if (bytes != 144 && bytes != 496) {
    error = "Use NTAG213/215";
    return false;
  }
  uint8_t data[496];
  for (size_t offset = 0; offset < bytes; offset += 16) {
    size = sizeof(block); // MFRC522 changes this on each transaction.
    if (reader.MIFARE_Read(uint8_t(4 + offset / 4), block, &size) != MFRC522::STATUS_OK) {
      error = "Hold tag still; retry";
      return false; // Never stream a partially read URL.
    }
    memcpy(data + offset, block, min(size_t(16), bytes - offset));
  }
  const auto result = ndef::parseTag(data, bytes, output, capacity);
  error = ndef::message(result);
  return result == ndef::Result::Ok;
}

void pollNfc() {
  if (!readerOk || !radio::elapsed(millis(), lastNfc, 250)) return;
  lastNfc = millis();
  if (!reader.PICC_IsNewCardPresent() || !reader.PICC_ReadCardSerial()) return;
  char url[256];
  const char* error = nullptr;
  const bool valid = readTagUrl(url, sizeof(url), error);
  reader.PICC_HaltA();
  reader.PCD_StopCrypto1();
  if (!valid) { toastMessage(error); return; }
  Serial.printf("NFC: URI read (%u bytes)\n", unsigned(strlen(url)));
  if (HARDWARE_TEST) { toastMessage("NFC URL OK"); return; }
  if (WiFi.status() != WL_CONNECTED) { toastMessage("Connect Wi-Fi first"); return; }
  snprintf(storyUrl, sizeof(storyUrl), "%s", url);
  const char* tail = strrchr(url, '/');
  snprintf(storyTitle, sizeof(storyTitle), "%s", tail && tail[1] ? tail + 1 : "NFC audio");
  if (char* query = strchr(storyTitle, '?')) *query = 0;
  storyMode = true;
  failures = 0;
  requestPlayback();
}

void drawScreen() {
  if (!displayOk || !radio::elapsed(millis(), lastUi, 200)) return;
  lastUi = millis();
  display.clearDisplay();
  char line[48];
  snprintf(line, sizeof(line), "KANGAROO   VOL %02d/%02u", desiredVolume.load(), MAX_VOLUME);
  textLine(0, line);
  if (fatal) {
    textLine(16, "SETUP ERROR");
    textLine(30, current.detail);
    textLine(46, "See Serial at 115200");
  } else if (HARDWARE_TEST) {
    textLine(14, "HARDWARE TEST");
    snprintf(line, sizeof(line), "Knob:%4d Button:%u", analogRead(PIN_VOLUME), buttonCount);
    textLine(26, line);
    textLine(38, readerOk ? "RC522 OK; tap a tag" : "RC522 NOT FOUND");
    textLine(52, toast[0] ? toast : "No Wi-Fi/audio here");
  } else if (WiFi.status() != WL_CONNECTED) {
    textLine(16, wifiAttempt ? "CONNECTING WI-FI" : "WI-FI NOT CONNECTED");
    textLine(30, wifiIndex ? "Trying backup network" : "Trying home network");
    textLine(46, "2.4GHz; check config");
  } else {
    textLine(14, storyMode ? "NFC AUDIO" : "LIVE RADIO");
    textLine(26, storyMode ? storyTitle : STATIONS[stationIndex].name);
    textLine(38, current.detail);
    if (storyMode && current.state == Playback::Playing) {
      if (current.duration) {
        const uint32_t left = current.duration > current.seconds ? current.duration - current.seconds : 0;
        snprintf(line, sizeof(line), "%02lu:%02lu left~%02lu:%02lu", (unsigned long)(current.seconds / 60), (unsigned long)(current.seconds % 60), (unsigned long)(left / 60), (unsigned long)(left % 60));
      } else snprintf(line, sizeof(line), "%02lu:%02lu / unknown", (unsigned long)(current.seconds / 60), (unsigned long)(current.seconds % 60));
      textLine(52, line);
    } else textLine(52, storyMode ? "Button: back to radio" : "Button: next station");
  }
  if (toast[0] && !radio::elapsed(millis(), toastStarted, 2500)) {
    display.fillRect(0, 51, 128, 13, SSD1306_BLACK);
    textLine(52, toast);
  } else toast[0] = 0;
  display.display();
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\nKANGAROO RADIO / DFR1139 / core 3.3.12 / audio 4.0.0");
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_VOLUME, ADC_11db);
  Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
  Wire.setTimeOut(50);
  Wire.beginTransmission(OLED_ADDRESS);
  displayOk = Wire.endTransmission() == 0 && display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS);
  if (displayOk) {
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setTextWrap(false);
  }
  Serial.printf("OLED: %s (0x3C)\n", displayOk ? "OK" : "NOT FOUND - check power/SDA/SCL");
  SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_CS);
  reader.PCD_Init();
  const uint8_t version = reader.PCD_ReadRegister(MFRC522::VersionReg);
  readerOk = version != 0 && version != 0xFF;
  Serial.printf("RC522: %s (version 0x%02X)\n", readerOk ? "OK" : "NOT FOUND", version);
  const bool ram = psramFound();
  Serial.printf("PSRAM: %s (%u bytes)\n", ram ? "OK" : "MISSING", unsigned(ESP.getPsramSize()));
  desiredVolume.store(knob.update(analogRead(PIN_VOLUME), MAX_VOLUME));
  if (HARDWARE_TEST) { Serial.println("TEST: turn knob, press/release button, scan an NDEF URI tag."); return; }
  if (!ram || ESP.getPsramSize() < 2000000 || !strcmp(WIFI_SSID, "YOUR_WIFI_SSID") || !WIFI_SSID[0]) {
    fatal = true;
    snprintf(current.detail, sizeof(current.detail), "%s", !ram || ESP.getPsramSize() < 2000000 ? "Enable PSRAM / board" : "Set Wi-Fi in config");
    Serial.printf("STOP: %s\n", current.detail);
    return;
  }
  commands = xQueueCreate(1, sizeof(Command));
  statuses = xQueueCreate(1, sizeof(Status));
  if (!commands || !statuses || xTaskCreatePinnedToCore(audioWorker, "radioAudio", 12288, nullptr, 1, nullptr, 1) != pdPASS) {
    fatal = true;
    snprintf(current.detail, sizeof(current.detail), "Audio task memory");
    Serial.println("STOP: cannot allocate audio task");
    return;
  }
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false); // The bounded home/backup cycle below owns retries.
  WiFi.setSleep(false);
  beginNetwork(0);
}

void loop() {
  const uint32_t now = millis();
  if (stationButton.update(digitalRead(PIN_BUTTON) == LOW, now)) {
    ++buttonCount;
    Serial.printf("BUTTON: %u\n", buttonCount);
    if (!HARDWARE_TEST && !fatal) selectRadio(!storyMode);
  }
  if (radio::elapsed(now, lastKnob, 25)) {
    lastKnob = now;
    desiredVolume.store(knob.update(analogRead(PIN_VOLUME), MAX_VOLUME));
  }
  if (!fatal) pollNfc();
  if (!HARDWARE_TEST && !fatal) {
    pollNetwork();
    Status incoming;
    if (xQueueReceive(statuses, &incoming, 0) == pdTRUE) {
      if (incoming.state == Playback::Fatal) { current = incoming; fatal = true; }
      else if (incoming.id == requestId) {
        const Playback previous = current.state;
        current = incoming;
        if (current.state == Playback::Playing) failures = 0;
        if (current.state == Playback::Error && previous != Playback::Error) {
          Serial.printf("PLAYBACK: %s\n", current.detail);
          if (!storyMode) { retryPending = true; retryStarted = now; }
        }
        if (current.state == Playback::Ended && previous != current.state) {
          completionPending = true;
          completedAt = now;
        }
      }
    }
    if (retryPending && WiFi.status() == WL_CONNECTED && radio::elapsed(now, retryStarted, radio::retryDelay(failures))) {
      if (failures < 3) ++failures;
      requestPlayback();
    }
    if (completionPending && radio::elapsed(now, completedAt, 4000)) selectRadio(false);
  }
  if (HARDWARE_TEST && radio::elapsed(now, lastDiagnostic, 1000)) {
    lastDiagnostic = now;
    Serial.printf("TEST: knob=%d volume=%d/%u button=%u\n", analogRead(PIN_VOLUME), desiredVolume.load(), MAX_VOLUME, buttonCount);
  }
  drawScreen();
  delay(2);
}
