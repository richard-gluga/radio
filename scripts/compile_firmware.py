#!/usr/bin/env python3
"""Compile real configured code paths without editing the user's sketch/config."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
versions = json.loads((ROOT / "scripts/versions.json").read_text())
cli = [os.environ.get("ARDUINO_CLI", "arduino-cli")]
if os.environ.get("ARDUINO_CLI_CONFIG"):
    cli += ["--config-file", os.environ["ARDUINO_CLI_CONFIG"]]

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--check-tools-only", action="store_true", help="verify installed versions without compiling")
args = parser.parse_args()

def cli_json(*arguments):
    return json.loads(subprocess.check_output(cli + list(arguments) + ["--format", "json"], text=True))

platforms = cli_json("core", "list")
libraries = cli_json("lib", "list")
installed = {item["id"]: item.get("installed_version") for item in platforms.get("platforms", [])}
installed.update({item["library"]["name"]: item["library"]["version"] for item in libraries.get("installed_libraries", [])})
for requirement in [versions["core"], *versions["libraries"]]:
    name, version = requirement.rsplit("@", 1)
    if installed.get(name) != version:
        sys.exit(f"Need {requirement}; installed: {installed.get(name, 'not found')}. Follow MAINTAINING.md before compiling.")
print("Installed core and all library versions match scripts/versions.json.", flush=True)
if args.check_tools_only:
    sys.exit(0)

for mode in ("radio", "diagnostic"):
    destination = ROOT / "build" / mode / "KangarooRadio_ABCKids"
    destination.mkdir(parents=True, exist_ok=True)
    for path in (ROOT / "firmware/KangarooRadio_ABCKids").iterdir():
        if path.suffix in (".ino", ".h"):
            shutil.copyfile(path, destination / path.name)
    config = (destination / "RadioConfig.h").read_text()
    config = config.replace('"YOUR_WIFI_SSID"', '"Kangaroo-Build-Test"').replace('"YOUR_WIFI_PASSWORD"', '"NotARealPassword"')
    config = config.replace('HARDWARE_TEST = false', f'HARDWARE_TEST = {str(mode == "diagnostic").lower()}')
    (destination / "RadioConfig.h").write_text(config)
    print(f"Compiling {mode} with {versions['core']}", flush=True)
    subprocess.run(cli + ["compile", "--fqbn", versions["fqbn"], "--build-path", str(ROOT / "build" / f"compiled-{mode}"), str(destination)], check=True)
