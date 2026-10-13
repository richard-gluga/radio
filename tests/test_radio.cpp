#include <cassert>
#include <iostream>
#include <string>
#include <vector>
#include "../firmware/KangarooRadio_ABCKids/NdefUri.h"
#include "../firmware/KangarooRadio_ABCKids/RadioLogic.h"
using Bytes = std::vector<uint8_t>;

Bytes uri(const std::string& s, uint8_t prefix = 4, bool longRecord = false) {
  Bytes r{uint8_t(longRecord ? 0xC1 : 0xD1), 1};
  const size_t n = s.size() + 1;
  if (longRecord) r.insert(r.end(), {0, 0, uint8_t(n >> 8), uint8_t(n)});
  else r.push_back(uint8_t(n));
  r.insert(r.end(), {'U', prefix});
  r.insert(r.end(), s.begin(), s.end());
  return r;
}
Bytes tag(const Bytes& r) {
  Bytes t{3};
  if (r.size() >= 255) t.insert(t.end(), {255, uint8_t(r.size() >> 8), uint8_t(r.size())});
  else t.push_back(uint8_t(r.size()));
  t.insert(t.end(), r.begin(), r.end());
  t.push_back(0xFE);
  return t;
}
int main() {
  char out[256];
  auto parse = [&](const Bytes& t) { return ndef::parseTag(t.data(), t.size(), out, sizeof(out)); };
  const std::string original = "richard-gluga.github.io/radio/assets/audio-check.wav";
  assert(parse(tag(uri(original))) == ndef::Result::Ok);
  assert(std::string(out) == "https://" + original);
  assert(parse(tag(uri("https://example.org/a.mp3", 0))) == ndef::Result::Ok);
  assert(std::string(out) == "https://example.org/a.mp3");
  for (uint8_t id = 1; id <= 4; ++id) assert(parse(tag(uri("example.org/a.mp3", id))) == ndef::Result::Ok);
  assert(parse(tag(uri("example.org/" + std::string(205, 'a'), 4, true))) == ndef::Result::Ok);
  assert(strlen(out) > 200);
  auto huge = tag(uri("example.org/" + std::string(250, 'a'), 4, true));
  assert(parse(huge) == ndef::Result::TooLong);
  auto shortTag = tag(uri(original)); shortTag.resize(48);
  assert(parse(shortTag) == ndef::Result::Truncated);
  auto unended = uri(original); unended[0] &= ~0x40;
  assert(parse(tag(unended)) == ndef::Result::Truncated);
  auto chunk = uri(original); chunk[0] |= 0x20;
  assert(parse(tag(chunk)) == ndef::Result::Unsupported);
  auto text = uri("https://example.org/test.mp3", 0); text[3] = 'T';
  assert(parse(tag(text)) == ndef::Result::Empty);
  auto multi = text; multi[0] &= ~0x40;
  auto r = uri(original); r[0] &= ~0x80;
  multi.insert(multi.end(), r.begin(), r.end());
  assert(parse(tag(multi)) == ndef::Result::Ok);
  auto duplicates = uri(original); duplicates[0] &= ~0x40;
  duplicates.insert(duplicates.end(), r.begin(), r.end());
  assert(parse(tag(duplicates)) == ndef::Result::Malformed);
  auto control = tag(uri(original)); control.insert(control.begin(), {0, 1, 3, 0xA0, 0x10, 0x44, 0});
  assert(parse(control) == ndef::Result::Ok);
  assert(parse(tag(uri("ftp://example.org/a", 0))) == ndef::Result::NotHttp);
  assert(parse(tag(uri("example.org/a b"))) == ndef::Result::NotHttp);
  assert(parse(tag(uri(std::string("example.org/a\0b", 15)))) == ndef::Result::NotHttp);
  assert(parse(Bytes{3, 255, 255, 255}) == ndef::Result::Truncated);
  assert(parse(Bytes{0, 0, 0xFE}) == ndef::Result::Empty);
  // Every truncated prefix of a real record must fail, never yield a partial URL.
  const auto full = tag(uri(original));
  for (size_t n = 0; n < full.size() - 1; ++n) {
    Bytes partial(full.begin(), full.begin() + n);
    assert(parse(partial) != ndef::Result::Ok);
  }
  radio::Button button;
  assert(!button.update(true, 100));
  assert(!button.update(false, 110));
  assert(!button.update(true, 120));
  assert(button.update(true, 155));
  assert(!button.update(true, 2000)); // Held button never repeats.
  assert(!button.update(false, 2100));
  assert(!button.update(false, 2135));
  assert(!button.update(true, 2200));
  assert(button.update(true, 2235));
  assert(radio::elapsed(15, UINT32_MAX - 20, 35));
  radio::Volume vol;
  for (int adc = 0; adc <= 4095; ++adc) {
    int v = vol.update(adc, 10);
    assert(v >= 0 && v <= 10);
  }
  assert(vol.update(4095, 10) == 10);
  for (int i = 0; i < 80; ++i) vol.update(0, 10);
  assert(vol.update(0, 10) == 0);
  assert(vol.update(4095, 0) == 0);
  assert(radio::retryDelay(99) == 30000);
  using End = radio::EndResult;
  assert(radio::classifyEnd(false, true, 20, 0) == End::StationLost);
  assert(radio::classifyEnd(true, false, 0, 0) == End::NeverStarted);
  assert(radio::classifyEnd(true, true, 12, 300) == End::Early);
  assert(radio::classifyEnd(true, true, 4, 5) == End::Ended);
  assert(radio::classifyEnd(true, true, 7, 0) == End::Ended);
  std::cout << "NDEF, truncation, button, volume, retry and EOF regressions passed\n";
}
