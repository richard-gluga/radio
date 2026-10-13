#!/usr/bin/env python3
"""Local assets, anchors, archives, pin/version contracts; no false external-link pass."""
from html.parser import HTMLParser
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit
import wave
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.links = set(), []
        self.feed(text)

    def handle_starttag(self, tag, attributes):
        a = dict(attributes)
        if "id" in a:
            assert a["id"] not in self.ids, f"Duplicate id {a['id']}"
            self.ids.add(a["id"])
        for key in ("href", "src"):
            if key in a:
                self.links.append(a[key])


pages = {p: Page(p.read_text()) for p in [ROOT / "index.html", *DOCS.glob("*.html")]}
for path, page in pages.items():
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            continue
        target = (path.parent / unquote(url.path)).resolve() if url.path else path
        assert target.exists(), f"Missing local link {path.name}: {link}"
        if url.fragment and target in pages:
            assert unquote(url.fragment) in pages[target].ids, f"Missing anchor {link}"

manifest = json.loads((DOCS / "downloads/manifest.json").read_text())
with zipfile.ZipFile(DOCS / "downloads/KangarooRadio_ABCKids.zip") as z:
    assert z.testzip() is None
    for item in manifest["files"]:
        name = item["name"]
        original = (ROOT / "firmware/KangarooRadio_ABCKids" / name).read_bytes()
        assert z.read(f"KangarooRadio_ABCKids/{name}") == original
        assert (DOCS / "downloads/KangarooRadio_ABCKids" / name).read_bytes() == original
        assert hashlib.sha256(original).hexdigest() == item["sha256"]

with wave.open(str(DOCS / "assets/audio-check.wav")) as f:
    assert (f.getnchannels(), f.getsampwidth(), f.getframerate(), f.getnframes()) == (1, 2, 22050, 110250)

readme = (ROOT / "README.md").read_text()
for document in ROOT.glob("*.md"):
    for link in re.findall(r'\]\(([^)]+)\)', document.read_text()):
        url = urlsplit(link)
        if not url.scheme and not url.netloc and url.path:
            assert (document.parent / unquote(url.path)).exists(), f"Missing Markdown link {document.name}: {link}"
pins = (ROOT / "firmware/KangarooRadio_ABCKids/Hardware.h").read_text()
expected = {"I2S_BCLK": 26, "I2S_LRC": 25, "I2S_DOUT": 13, "OLED_SDA": 21, "OLED_SCL": 22, "RFID_CS": 4, "RFID_RST": 17, "RFID_SCK": 18, "RFID_MISO": 19, "RFID_MOSI": 23, "BUTTON": 14, "VOLUME": 35}
assert len(set(expected.values())) == len(expected), "Pin collision"
for key, value in expected.items():
    assert f"PIN_{key} = {value};" in pins, f"Update reviewed pin contract for {key}"
    assert f"GPIO{value}" in readme, f"GPIO{value} missing from tutorial"
versions = json.loads((ROOT / "scripts/versions.json").read_text())
for dependency in [versions["core"], *versions["libraries"]]:
    assert dependency.split("@")[-1] in readme

generated = ROOT / "build/web-generated.zip"
if generated.exists():
    with zipfile.ZipFile(generated) as z:
        assert z.testzip() is None
        assert set(z.namelist()) == {f"KangarooRadio_ABCKids/{x['name']}" for x in manifest['files']}
        for item in manifest["files"]:
            if item["name"] != "RadioConfig.h":
                assert z.read(f"KangarooRadio_ABCKids/{item['name']}") == (ROOT / "firmware/KangarooRadio_ABCKids" / item['name']).read_bytes()
        config = z.read("KangarooRadio_ABCKids/RadioConfig.h")
    with tempfile.TemporaryDirectory() as directory:
        p = Path(directory)
        (p / "RadioConfig.h").write_bytes(config)
        (p / "test.cpp").write_text(r'''#include "RadioConfig.h"
#include <cassert>
#include <cstring>
int main() {
  assert(!strcmp(WIFI_SSID, " Family\"WiFi\\Name "));
  assert(!strcmp(WIFI_PASSWORD, "pass\"word\\n"));
  assert(MAX_VOLUME == 10 && !HARDWARE_TEST);
}
''')
        subprocess.run(["g++", "-std=c++17", str(p / "test.cpp"), "-o", str(p / "test")], check=True)
        subprocess.run([str(p / "test")], check=True)

print(f"Checked {len(pages)} HTML pages, local links, source/ZIP hashes, audio metadata, pins and versions.")
