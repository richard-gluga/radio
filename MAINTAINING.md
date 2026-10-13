# Maintaining Kangaroo Radio

The README is the complete tutorial. `site/template.html` is the website shell, and `scripts/build_site.py` renders the README into `docs/index.html`. Edit those sources, then regenerate; do not hand-edit generated HTML or the copies of firmware under `docs/downloads/`.

## Source ownership

- `firmware/KangarooRadio_ABCKids/`: canonical sketch, configuration, pin definitions, station list and pure parsing/control helpers.
- `scripts/versions.json`: pinned core, libraries and the exact FQBN used to compile.
- `README.md`: build instructions, matching pin tables and primary references.
- `docs/app.js`, `docs/lib.js`, `docs/styles.css`: browser tools and appearance.
- `site/experience.json`, `site/tools.html`, `scripts/experience.py`: guided stage summaries, checkpoints and tools inserted beside the canonical instructions. Software step numbering uses Markdown's `sane_lists` extension.
- `docs/workshop.js`, `docs/workshop.css`, `docs/wiring.js`, `docs/peripherals.js`: saved build/shopping state, symptom guidance, interactive wiring and workshop layout. Keep the troubleshooting sequences aligned with the README table and the pin map aligned with `Hardware.h`. Module drawings in `peripherals.js` give component-side/front header positions and link their primary references. Check orientation as well as pin names before changing a drawing. Breadboard and control-terminal sketches are labelled separately.
- `site/printables.html`, `docs/printables.css`, `docs/printables.js`: card artwork, labels, full-size cardboard pieces, bench sheet and blank physical-build record. These are planning aids; drilling centres require a physically checked enclosure and received parts.
- `site/story.txt`, `docs/assets/pip-story.svg`: original story and vector artwork. `scripts/make_story.py` renders the committed narration WAV using the local eSpeak NG shared library and voice data. It is separate from the normal site build; run it if the transcript changes.
- `docs/assets/wiring.svg`: original connection overview. It is not a physical wiring photograph.
- `docs/vendor/hls-1.6.13.min.js` and `hls-LICENSE.txt`: pinned third-party browser HLS playback.
- `scripts/build_site.py`: generates HTML, identical firmware copies, SHA-256 manifest, deterministic ZIP, station JSON and the original five-second audio-check WAV.
- `VALIDATION.md`: evidence and explicit physical acceptance checks. Do not replace pending measurements with guesses.

Never commit real Wi-Fi credentials. Generate personalised ZIPs outside this checkout. The committed configuration intentionally stops normal operation until the home SSID is configured. This means a compiler can optimise away normal playback in that default build; **compile the configured normal-radio variant as well as Hardware test**.

## Local checks

Python 3, Node.js and a C++17 compiler are needed for contributor checks, not for building the radio with Arduino IDE.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python scripts/build_site.py
.venv/bin/python scripts/build_site.py --check
python3 tests/check_repository.py
node --test tests/test_web.mjs tests/test_workshop.mjs
g++ -std=c++17 -Wall -Wextra -Werror tests/test_radio.cpp -o build/test-radio
./build/test-radio
```

On Windows, use the virtual environment's `Scripts/python.exe` instead of `.venv/bin/python`, and the C++ compiler installed on your computer. Create `build/` before compiling if it does not exist. Generated outputs are committed so readers need neither Python nor Node.js.

## Clean ESP32 compile

Install Arduino CLI from the official Arduino site and run these commands, or use the identical versions/settings in tutorial section 4:

```sh
arduino-cli core update-index --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core install esp32:esp32@3.3.12 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli lib install 'ESP32-audioI2S-master@4.0.0' 'Adafruit SSD1306@2.5.17' 'Adafruit GFX Library@1.12.6' 'Adafruit BusIO@1.17.4' 'MFRC522@1.4.12'
python3 scripts/compile_firmware.py
```

`compile_firmware.py` first checks installed core/library versions, then copies the canonical sketch into ignored build folders, supplies fictional credentials, and compiles both operating modes using `scripts/versions.json`. It never changes the committed configuration or uploads to hardware. Use `--check-tools-only` to check versions without compiling. Set `ARDUINO_CLI` and optionally `ARDUINO_CLI_CONFIG` to use a separately installed toolchain. Allow several GB for ESP32 tools. A full package installs toolchains for other ESP32 families too.

## Browser checks

Serve the repository, not a `file://` URL:

```sh
python3 -m http.server 8769 --bind 127.0.0.1
```

Open `http://127.0.0.1:8769/`. The redirect preserves query and fragment. The content also works when `docs/` alone is the hosting root, as on GitHub Pages. `tests/browser.cjs` uses Playwright Chromium for responsive layout, configured ZIP downloads, real WAV playback and cancellation checks. Install Playwright in a separate local environment and set `PLAYWRIGHT_MODULE` to its module path if it is not available through ordinary Node resolution. Set `CHROME_PATH` if using an existing Chrome binary. Run `node tests/browser.cjs` while the server is active.

Also run `node tests/workshop.cjs`. It exercises saved progress, all connection groups and symptoms, shopping export, the single configuration form's movement between upload stages, credential non-storage, mobile layouts, actual story playback, print visibility/scale, and unavailable-storage/no-JavaScript fallbacks. It writes review PDFs under ignored `build/`; inspect these visually for page breaks and correct dimensions. Print at actual size and measure the 50 mm square before using any outline. Browser PDF dimensions cannot verify a physical printer's scaling.

The guided path saves only its current stage, view preference, build/tool checkmarks and shopping choices under `kangaroo-build-v1`. It does not save credentials. The configuration inputs remain disabled until the local form handler is attached, preventing native form submission if JavaScript is unavailable. Changes to checkpoint meaning or part IDs may require a state-version bump; never reinterpret an old completed checkbox as proof of a new physical check. The configuration form remains a single DOM node, preserving edits when moved to the normal-radio stage. A first visit to each upload stage selects its relevant operating mode; the user can change it explicitly.

Unit tests use controlled media events for race conditions. Real WAV playback confirms the local media file/browser path. Neither proves live-stream decoding on an ESP32. Check the six real endpoints separately, and test actual hardware in Australia for ABC.

## Publishing

For GitHub Pages, publish the `docs/` folder on the intended branch using the repository's existing Pages configuration. Generate and check the site before committing/publishing. All files under `docs/`, including `downloads/`, `vendor/` and `assets/`, must be included.

After publication, open the real site, download a configured ZIP, verify its contents, and open both `assets/audio-check.wav` and `assets/pip-and-the-little-light.wav` from the phone that will write the tag. The audio-copy actions derive the public URL from the current hosting location. Test a saved build and each printable sheet on the published site.

## External links and dependency updates

The local checker verifies files, anchors, sketch copies, archive content and documented version/pin consistency. It does not declare all external links healthy. Retail sites may reject automated requests; distinguish an anti-bot 403 from a real missing product. Verify SKUs against the actual product specification, not a descriptive URL slug.

When updating the audio library, inspect its event API, PSRAM requirements and supported Arduino core. Recompile both modes and repeat the physical checks. Changing a board or power component requires checking its schematic, connector polarity, regulator/current ratings, charging arrangement, pins and mounting dimensions. A superficially similar part is not a tested drop-in replacement.

For station URL changes, edit `Stations.h`, regenerate, test browser playback and verify decoding on hardware. Treat successful HTTP responses as availability evidence, not proof of a functioning radio. Record the date of price/source checks, not a permanent “verified” badge.

## Licences

Original project files are MIT. The original test tone is generated from a mathematical waveform by `build_site.py`, and contains no third-party recordings. HLS.js is Apache-2.0; its licence is included next to the vendored script. The Arduino libraries keep their upstream licences and are installed by the reader. Station streams and linked product documentation remain their owners' material.

Pip's story, artwork and computer-narrated WAV are original project assets under MIT. The narration uses eSpeak NG's standard English voice (`en`, 145 words/minute, amplitude 65); the speech engine is not bundled. Preserve the computer-narration label. Do not present concept illustrations, sample Serial messages or browser playback as photographs, captured hardware output or a successful physical build.
