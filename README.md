# 📻 Kangaroo Radio — DIY USB-C ABC Kids Radio

> **A beginner-friendly, zero-soldering guide to building a one-switch, USB-C rechargeable ABC Kids radio in Australia.**

[![Live Documentation](https://img.shields.io/badge/Live_Site-GitHub_Pages-2ea44f?style=for-the-badge&logo=github)](https://richard-gluga.github.io/radio/)
[![Hardware](https://img.shields.io/badge/Hardware-ESP32_&_MAX98357A-blue?style=for-the-badge&logo=espressif)](https://richard-gluga.github.io/radio/#parts-guide)
[![Location](https://img.shields.io/badge/Broadcast-Sydney,_Australia-amber?style=for-the-badge)](https://richard-gluga.github.io/radio/#the-truth)

![Finished DIY Wooden Radio](docs/assets/hero.jpg)

---

## 🌐 Live Interactive Guide
Visit the published interactive website with our **Live Budget Calculator**, **Acoustic Simulator**, **Interactive Pinout Explorer**, and **Wi-Fi Firmware Generator**:
👉 **[https://richard-gluga.github.io/radio/](https://richard-gluga.github.io/radio/)**

---

## ⚠️ The Important Catch: Why Analog FM Kits Won't Work
In Sydney (and across Australia), **ABC Kids Listen is not broadcast on analog AM or FM radio**. 

ABC Kids is a **digital-only station**:
1. **DAB+ (Digital Audio Broadcasting):** Sydney digital block 9C.
2. **Online Internet Stream:** High-quality direct MP3/AAC stream.

If you buy a traditional analog FM receiver kit, **it will be completely silent on ABC Kids**. 

### The Solution:
We build a dedicated **ESP32 Wi-Fi Radio**:
- Flick the physical toggle switch **ON**.
- It connects to your home Wi-Fi in ~2 seconds and immediately streams the official ABC Kids digital stream (`http://live-radio01.mediahubaustralia.com/XTDW/mp3/`).
- Sounds crystal clear through a high-efficiency **3.2W I2S digital amplifier** (zero analog static or indoor hiss).
- Rechargeable via **USB-C** with an internal 18650 lithium battery (12–18 hours battery life).

---

## 📸 Component Flat Lay
![Parts Flat Lay](docs/assets/parts.jpg)

---

## 🛒 Bill of Materials & Australian Retailers

All components can be ordered from **[Core Electronics](https://core-electronics.com.au)** (Newcastle, NSW) in a single order, or via **Amazon AU** and **Jaycar**:

| Component | Exact Specification | Est. Price (AUD) | Sourcing Links |
| :--- | :--- | :--- | :--- |
| **Brain** | ESP32 Development Board (USB-C) | ~$9.50 | [Core Electronics](https://core-electronics.com.au/search/?q=esp32+type-c) / [Amazon AU](https://www.amazon.com.au/s?k=esp32+type+c+development+board) / [Jaycar XC3800](https://www.jaycar.com.au/p/XC3800) |
| **DAC & Amp** | MAX98357A I2S 3.2W Mono Amp | ~$6.90 | [Core Electronics](https://core-electronics.com.au/search/?q=MAX98357A) / [Amazon AU](https://www.amazon.com.au/s?k=MAX98357A+I2S+amplifier) |
| **Speaker** | 3W or 5W 4Ω Full-Range Cone (40–50mm) | ~$6.50 | [Core Electronics](https://core-electronics.com.au/search/?q=3w+speaker+4+ohm) / [Amazon AU](https://www.amazon.com.au/s?k=3w+4+ohm+full+range+speaker) / [Jaycar AS3004](https://www.jaycar.com.au/p/AS3004) |
| **Battery** | 18650 Li-ion (3.7V ~2600mAh) + Holder with Leads | ~$11.50 | [Core Electronics](https://core-electronics.com.au/search/?q=18650+battery+holder) / [Amazon AU](https://www.amazon.com.au/s?k=18650+battery+holder+with+leads) |
| **Charger** | TP4056 USB-C with DW01A Protection | ~$3.50 | [Core Electronics](https://core-electronics.com.au/search/?q=usb-c+lipo+charger) / [Amazon AU](https://www.amazon.com.au/s?k=TP4056+USB-C+protection) |
| **Controls** | SPST Toggle Switch + 10kΩ Potentiometer | ~$3.80 | [Core Electronics](https://core-electronics.com.au/search/?q=toggle+switch+potentiometer) / [Jaycar ST0570](https://www.jaycar.com.au/p/ST0570) |
| **Wiring** | Dupont Jumper Wires (40-pack F-to-F & M-to-F) | ~$4.00 | [Core Electronics](https://core-electronics.com.au/search/?q=dupont+jumper+wires) / [Jaycar WC6024](https://www.jaycar.com.au/p/WC6024) |
| **Enclosure** | Small Timber Craft Box | ~$5.00 | [Kmart Wooden Box](https://www.kmart.com.au/search/?searchTerm=wooden+box) / [Bunnings Craft Box](https://www.bunnings.com.au/search/products?q=craft+box) |

---

## 🔌 Pin-by-Pin Wiring Guide

Connect the components with standard push-on Dupont jumper wires:

```
    MAX98357A Pin         ESP32 Pin
   ────────────────     ─────────────
   LRC (Word Clock)  ──► GPIO 25
   BCLK (Bit Clock)  ──► GPIO 26
   DIN (Data In)     ──► GPIO 22
   GND               ──► GND
   VIN               ──► VIN (or 5V Rail)
   GAIN              ──► Leave Floating (defaults to 9dB)

    Power System          Connections
   ───────────────     ─────────────────
   18650 Battery (+) ──► TP4056 B+
   18650 Battery (-) ──► TP4056 B-
   TP4056 OUT+       ──► Through SPST Toggle Switch ──► ESP32 VIN & Amp VIN
   TP4056 OUT-       ──► Common GND
```

---

## 📦 Cabinet Assembly
![Cabinet Interior Assembly](docs/assets/assembly.jpg)

### The Secret to Great Sound:
Never run a speaker cone bare on a table! The sound wave from the back cancels out the sound from the front (acoustic phase cancellation), making it sound thin and squeaky. Mounting the speaker inside a **sealed wooden box** with a circular cutout traps the back wave, providing deep, warm room-filling acoustics.

---

## ⚡ Quick Start Firmware

1. Install [Arduino IDE](https://www.arduino.cc/en/software).
2. Add ESP32 boards manager URL:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. In Library Manager, install **`ESP32-audioI2S`** (by *schreibfaul1*).
4. Open [`firmware/KangarooRadio_ABCKids.ino`](firmware/KangarooRadio_ABCKids.ino), input your Wi-Fi credentials, and hit **Upload**!

---

## ⚠️ Common Gotchas
1. **2.4 GHz Wi-Fi Only:** The ESP32 cannot connect to 5GHz Wi-Fi networks. Ensure you connect to your router's 2.4GHz network.
2. **Australian Geoblocking:** ABC Kids streams are geoblocked to Australian IP addresses.
3. **Lithium Safety:** Always use a TP4056 board with integrated **DW01A battery protection** (identified by 4 solder pads: B+, B-, OUT+, OUT-).
4. **Car / Portable Use:** Add your mobile phone's hotspot name/password as a secondary network so the radio works on camping trips and road trips!

---

## 📄 License
MIT License. Open-source hardware and software guide for Australian makers and families.
