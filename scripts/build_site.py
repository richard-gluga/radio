#!/usr/bin/env python3
"""Build committed static docs and exact sketch downloads from canonical sources."""
import hashlib
import io
import json
import math
from pathlib import Path
import re
import struct
import sys
import wave
import zipfile

import markdown

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SKETCH = ROOT / "firmware/KangarooRadio_ABCKids"


def products():
    readme = (ROOT / "README.md").read_text()
    # Local links must work with GitHub Pages publishing docs/ directly.
    readme = re.sub(r'\]\(docs/([^)]*)\)', r'](\1)', readme)
    for name in ["VALIDATION", "MAINTAINING"]:
        readme = readme.replace(f"]({name}.md)", f"]({name.lower()}.html)")
    readme = readme.replace("](LICENSE)", "](LICENSE.txt)")
    readme = readme.replace("](firmware/KangarooRadio_ABCKids)", "](downloads/KangarooRadio_ABCKids.zip)")
    md = markdown.Markdown(extensions=["tables", "fenced_code", "toc"], extension_configs={"toc": {"toc_depth": "2"}})
    content = md.convert(readme)
    # Preserve the table on desktop; make its four fields readable as cards on
    # phones, where narrow part numbers and long specifications otherwise wrap.
    def shopping_table(match):
        labels = iter(["Quantity", "Part to buy", "Important details", "Purchase/reference"] * match.group().count("<tr>"))
        table = re.sub(r"<td>", lambda _: f'<td data-label="{next(labels)}">', match.group())
        return table.replace("<table>", '<table class="parts-table">', 1)
    content = re.sub(r"<table>.*?</table>", shopping_table, content, count=1, flags=re.S)
    template = (ROOT / "site/template.html").read_text()
    yield DOCS / "index.html", template.replace("<!-- GUIDE -->", content).replace("<!-- CONTENTS -->", md.toc).encode()
    for name in ["VALIDATION", "MAINTAINING"]:
        body = markdown.markdown((ROOT / f"{name}.md").read_text(), extensions=["tables", "fenced_code"])
        body = body.replace('href="README.md"', 'href="index.html"').replace('href="LICENSE"', 'href="LICENSE.txt"')
        for linked in ["VALIDATION", "MAINTAINING"]:
            body = body.replace(f'href="{linked}.md"', f'href="{linked.lower()}.html"')
        page = f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{name.title()} — Kangaroo Radio</title><link rel="stylesheet" href="styles.css"><body><main class="standalone guide"><a href="index.html">← Back to the build guide</a>{body}</main></body></html>'
        yield DOCS / f"{name.lower()}.html", page.encode()
    yield DOCS / "LICENSE.txt", (ROOT / "LICENSE").read_bytes()

    files = {p.name: p.read_bytes() for p in sorted(SKETCH.iterdir()) if p.suffix in (".ino", ".h")}
    manifest = {"folder": SKETCH.name, "files": []}
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_STORED) as z:
        for name, data in files.items():
            manifest["files"].append({"name": name, "sha256": hashlib.sha256(data).hexdigest()})
            yield DOCS / "downloads" / SKETCH.name / name, data
            info = zipfile.ZipInfo(f"{SKETCH.name}/{name}", date_time=(2026, 1, 1, 0, 0, 0))
            info.external_attr = 0o644 << 16
            z.writestr(info, data)
    yield DOCS / "downloads" / "manifest.json", (json.dumps(manifest, indent=2) + "\n").encode()
    yield DOCS / "downloads" / f"{SKETCH.name}.zip", archive.getvalue()
    station_source = (SKETCH / "Stations.h").read_text()
    stations = [{"name": a, "url": b, "page": c} for a, b, c in re.findall(r'\{"([^"]+)", "([^"]+)", "([^"]+)"\}', station_source)]
    assert len(stations) == 6, "Station parser must match every canonical station"
    yield DOCS / "stations.json", (json.dumps(stations, indent=2) + "\n").encode()

    # Original, deterministic five-second mono PCM diagnostic. No book excerpts.
    signal = io.BytesIO()
    with wave.open(signal, "wb") as wav:
        rate = 22050
        wav.setparams((1, 2, rate, 0, "NONE", "not compressed"))
        samples = bytearray()
        for i in range(rate * 5):
            t = i / rate
            phase = t % 1
            envelope = min(1, phase / 0.025, max(0, (0.75 - phase) / 0.025)) if phase < 0.75 else 0
            freq = (330, 440, 550, 440, 330)[int(t)]
            samples.extend(struct.pack("<h", round(32767 * 0.08 * envelope * math.sin(2 * math.pi * freq * t))))
        wav.writeframes(samples)
    yield DOCS / "assets/audio-check.wav", signal.getvalue()


def main():
    check = "--check" in sys.argv
    different = []
    for path, data in products():
        if not path.exists() or path.read_bytes() != data:
            different.append(str(path.relative_to(ROOT)))
            if not check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
    if check and different:
        sys.exit("Generated files are stale: " + ", ".join(different))
    print("Generated files match canonical sources." if check else f"Updated {len(different)} generated files.")


if __name__ == "__main__":
    main()
