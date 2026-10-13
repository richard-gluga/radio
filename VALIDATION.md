# Verification record

This record distinguishes source/build checks from physical results. It must not be described as a completed hardware test report. Revision date: **13 October 2026**.

## Configuration reviewed

- Board: DFRobot **DFR1139**, ESP32-WROOM-32E N16R2, 16 MB flash and 2 MB PSRAM.
- Audio: Adafruit **3006** MAX98357A; Core **CE08483**, enclosed 8 Ω/5 W speaker.
- Display: DFRobot **DFR0650**, I2C SSD1306 at 0x3C.
- NFC: SunFounder **CN0090** SPI RC522; NTAG213/215 URI records.
- Power: board's onboard charger/source switching; protected Adafruit **1781** pack; ST0579 in a separate battery-positive extension. USB bypasses that switch.
- Software: Arduino ESP32 **3.3.12**, ESP32-audioI2S-master **4.0.0**, SSD1306 **2.5.17**, GFX **1.12.6**, BusIO **1.17.4**, MFRC522 **1.4.12**.

The pin map is checked against the manufacturer's DFR1139 schematic. GPIO16 is excluded for PSRAM; GPIO34 is excluded from the knob because it is the battery divider. The amplifier uses VCC, not 3V3. The display, reader and potentiometer use 3V3. Speaker outputs are isolated from GND.

## Automated evidence

| Check | Status |
|---|---|
| Original NFC truncation regression; binary NDEF URI prefix 0; short/long record lengths; malformed/duplicate records | Host tests pass with address/undefined-behavior sanitizers; leak checking disabled because this environment traces processes |
| Button press/release, held-button behavior, millis wrap, knob cap/mute, retry backoff, never-started/early/normal EOF | Host tests pass |
| ESP32 compile with committed placeholder configuration | Passed; this alone is insufficient because the compiler can remove unreachable playback code |
| Configured normal-radio and diagnostic builds | Passed using core 3.3.12 and every pinned library; compiler-reported program storage: normal radio 1,913,612 bytes, diagnostic 426,488 bytes, each within the 3,145,728-byte application partition |
| Generated sketch, ZIP, manifest, station and guide consistency | Passed: generated outputs match sources byte-for-byte; ZIP CRCs and manifest SHA-256 hashes checked |
| Browser credential escaping and download | Passed: spaces, quotes, backslashes, UTF-8 encoding, empty passwords and invalid configuration tests; downloaded ZIP independently extracted and compiled for ESP32 (1,913,596 bytes with the test's volume cap 11) |
| Browser playback cancellation, errors and responsive layout | Passed in headless Chrome: original WAV decoded with five-second duration; stop/switch and late callbacks tested; no overflow at widths 360, 390, 768, 1280 or 1920 px; no uncaught page errors |
| Local file links and anchors | Passed: root redirect, generated HTML assets/anchors and local Markdown targets |
| Live endpoints | All six returned HTTP 200 on 13 October 2026. Four returned live audio and ABC returned HLS playlists; this is availability evidence, not an ESP32 playback result |

The configured radio uses 59,608 bytes of statically allocated internal RAM. That figure excludes runtime allocations, task stacks, TLS and PSRAM buffers; it is not proof of sufficient memory under every live-stream condition. The browser test also rejects a download whose source hash changes halfway through generation. Reproduction commands are in [MAINTAINING.md](MAINTAINING.md).

During the pre-publication external-link check, the new public `assets/audio-check.wav` URL returned 404 because the revised site was not yet deployed. Its file existed and played locally. The guide requires checking the published URL before writing a tag. DigiKey and Jaycar rejected direct automated requests with HTTP 403; their product pages were separately reviewed through the web lookup tool. They were not misclassified as missing products. Other actual tutorial/reference links responded successfully; example domains are placeholders, not offered audio files.

## Corrections covered by this revision

| Earlier issue | Correction and evidence |
|---|---|
| Board/audio-library mismatch | DFR1139 with 2 MB PSRAM, exact core/library versions and explicit flash/partition/PSRAM settings; configured compilation exercises the playback code |
| Conflicting or unsuitable GPIO assignments | One pin map in `Hardware.h`, matching tutorial/diagram; ADC1 GPIO35 for the knob, excluding the onboard battery divider and PSRAM connection |
| Ambiguous amplifier power and speaker wiring | VCC-to-VIN, separate 3V3 bus, 8 Ω enclosed speaker, explicit gain connection and isolated speaker outputs |
| Charger, battery and switch assumptions | Board's own source switching/charger; Adafruit 1781 has a documented charging-current recommendation; exact extension and polarity procedure; ST0579 has an explicit DC contact rating |
| Retailer field contradicts switch datasheet | ST0570 was excluded: its web fields say DC, but its linked drawing gives AC ratings. ST0579 is the selected part |
| Incomplete shopping and assembly steps | Headers, soldering, tools, connectors, insulated distribution, knob, mounting hardware, USB supply and enclosure clearance are included |
| Display/reader/tag ambiguity | Exact SSD1306/I2C display and SPI reader, supported NTAG213/215 URI workflow, explicit exclusion of supplied S50 tags |
| Truncated URLs and incorrect NDEF handling | Bounded byte parser, full advertised memory read, URI prefix expansion, malformed/partial/oversize rejection and host regression cases |
| Fake playback state, progress or successful story completion | Decoder-derived states, approximate/unknown timing, EOF classification and explicit errors; no unconditional Done label |
| Controls freezing during connection attempts | Audio/network connection work belongs to the audio task; UI queues the latest selection; remaining DNS/TLS latency is documented |
| Volume starts above its configured cap | Initial and ongoing audio volume both use the clamped knob value; no independent startup volume |
| Missing recovery and confusing station button | Bounded Wi-Fi home/backup attempts, station retry delays, one action per press and story-to-radio behavior |
| Browser code differs from supplied firmware | Browser packages canonical source files and changes only `RadioConfig.h`; checksums reject a mixed deployment |
| Broken credential escaping or silently changed spaces | Byte-preserving C++ string escaping, input validation, and independent extraction/compile tests |
| Browser playback races and misleading previews | Old media listeners/promises invalidated on switch/close; real media controls, real test WAV and explicit error states |
| Wrong audio and illustrative images presented as evidence | Unattributed book samples and misleading images removed; original test signal, original logical SVG and labelled concept illustration |
| Unsupported cost, hearing-safety, runtime or NFC-range claims | Removed guarantees; complete shopping checklist and explicit measurement/acceptance steps |
| Incomplete FM alternative and duplicated documentation | FM fragment removed; canonical README generates the website guide; station list generates browser data |

The remaining physical checks below are real gaps in validation, not completed work disguised as documentation.

## Physical acceptance checklist — not performed here

Do not mark these complete without an assembled radio and actual observations. Record board revisions, supply, battery, firmware/configuration, date and any changed part.

- Bare board uploads with the documented settings, reports 2 MB PSRAM and boots reliably without GPIO0 grounded.
- Measure polarity before the first battery connection. Verify 3V3 and VCC voltage with USB and battery power. Check continuity on the disconnected switch harness and all four operating/charging states.
- Record total USB current while charging/playing and battery-path peak/steady current. Keep within the board, diode, recommended 1 A sustained battery load and switch ratings. Check heat and voltage droop at the loudest configured level and near the lower usable battery voltage. Protection circuitry must not be the routine method of switching off.
- Display has no clipped critical instructions, pot mutes and reaches the cap, each button press acts once, and missing peripherals yield useful diagnostics.
- Play every retained station on the actual device. ABC testing requires an Australian internet connection. Check a home network, a 2.4 GHz phone hotspot and loss/restoration of internet and Wi-Fi.
- Write both NTAG213 and NTAG215 with the supported phone workflow. Test prefix-compressed and uncompressed URLs, the full demo URL, malformed/incomplete tags, remove/re-present, changing tags while connecting, and button cancellation.
- Play the five-second PCM WAV and a known-length constant-bitrate MP3. Observe time/unknown-duration behavior, successful completion, mid-file disconnection and the four-second return. Verify that a never-started file and a known early EOF remain errors; an ordinary EOF says End, without certifying complete delivery.
- Test reader range through the actual lid with the speaker/battery in their final positions. Test USB access, switches, loose-wire resistance, strain relief, sharp edges and battery retention.
- Measure listening sound level at a stated distance using a suitable meter and representative loud sources, on USB and a full battery. Record conditions and results; software steps are not dBA.
- Measure runtime and charge behavior; record capacity, volume, station and cutoff criterion. Do not restore a 12–18-hour promise without those measurements.
- Ask a novice who did not write the guide to complete the build using only these instructions. Record every ambiguity and fix it before calling the guide novice-validated.

No actual build photographs, sound-pressure measurements, battery endurance results or electrical certification are supplied by this repository revision. The original misleading images and audio examples have been removed rather than presented as evidence.
