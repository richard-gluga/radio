#pragma once
#include <stddef.h>
#include <stdint.h>
#include <string.h>

// Pure byte parser: usable on ESP32 and in the host regression tests.
// Type 2 TLVs, unchunked NDEF messages, one HTTP(S) URI (prefix 0..4).
namespace ndef {
enum class Result { Ok, Empty, Truncated, Malformed, Unsupported, TooLong, NotHttp };
inline const char* message(Result r) {
  switch (r) {
    case Result::Ok: return "URL read";
    case Result::Empty: return "No URI record";
    case Result::Truncated: return "Incomplete tag";
    case Result::Malformed: return "Invalid NDEF";
    case Result::Unsupported: return "Unsupported record";
    case Result::TooLong: return "URL too long";
    case Result::NotHttp: return "Use HTTP(S) URL";
  }
  return "Tag error";
}
inline bool httpUrl(const char* url) {
  size_t start = !strncmp(url, "https://", 8) ? 8 : !strncmp(url, "http://", 7) ? 7 : 0;
  if (!start || !url[start] || url[start] == '/' || url[start] == '?' || url[start] == '#') return false;
  for (size_t i = start; url[i]; ++i) {
    const auto c = static_cast<uint8_t>(url[i]);
    if (c <= 32 || c >= 127 || c == '\\') return false;
  }
  return true;
}
inline Result parseMessage(const uint8_t* data, size_t size, char* out, size_t capacity) {
  if (!capacity) return Result::TooLong;
  out[0] = 0;
  size_t p = 0;
  bool first = true, found = false, ended = false;
  while (p < size) {
    if (size - p < 3) return Result::Truncated;
    const uint8_t flags = data[p++], typeLength = data[p++];
    if ((bool(flags & 0x80) != first) || ended) return Result::Malformed;
    if (flags & 0x20) return Result::Unsupported; // Chunked NDEF deliberately rejected.
    first = false;
    size_t payloadLength = 0;
    if (flags & 0x10) payloadLength = data[p++];
    else {
      if (size - p < 4) return Result::Truncated;
      for (int i = 0; i < 4; ++i) payloadLength = (payloadLength << 8) | data[p++];
    }
    size_t idLength = 0;
    if (flags & 0x08) {
      if (p == size) return Result::Truncated;
      idLength = data[p++];
    }
    if (size - p < typeLength) return Result::Truncated;
    const size_t typeStart = p;
    p += typeLength;
    if (size - p < idLength) return Result::Truncated;
    p += idLength;
    if (size - p < payloadLength) return Result::Truncated;
    if ((flags & 7) == 1 && typeLength == 1 && data[typeStart] == 'U') {
      if (found || !payloadLength) return Result::Malformed;
      static const char* const prefixes[] = {"", "http://www.", "https://www.", "http://", "https://"};
      const uint8_t id = data[p];
      if (id >= 5) return Result::NotHttp;
      const size_t prefixLength = strlen(prefixes[id]);
      const size_t suffixLength = payloadLength - 1;
      if (prefixLength >= capacity || suffixLength >= capacity - prefixLength) return Result::TooLong;
      memcpy(out, prefixes[id], prefixLength);
      for (size_t i = 0; i < suffixLength; ++i) {
        const uint8_t c = data[p + 1 + i];
        if (c <= 32 || c >= 127) return Result::NotHttp;
        out[prefixLength + i] = char(c);
      }
      out[prefixLength + suffixLength] = 0;
      if (!httpUrl(out)) return Result::NotHttp;
      found = true;
    }
    p += payloadLength;
    ended = flags & 0x40;
    if (ended && p != size) return Result::Malformed;
  }
  if (!ended) return Result::Truncated;
  return found ? Result::Ok : Result::Empty;
}
inline Result parseTag(const uint8_t* data, size_t size, char* out, size_t capacity) {
  if (!capacity) return Result::TooLong;
  out[0] = 0;
  for (size_t p = 0; p < size;) {
    const uint8_t type = data[p++];
    if (type == 0) continue;
    if (type == 0xFE) return Result::Empty;
    if (p == size) return Result::Truncated;
    size_t length = data[p++];
    if (length == 0xFF) {
      if (size - p < 2) return Result::Truncated;
      length = (size_t(data[p]) << 8) | data[p + 1];
      p += 2;
    }
    if (length > size - p) return Result::Truncated;
    if (type == 3) return length ? parseMessage(data + p, length, out, capacity) : Result::Empty;
    // A normal NTAG213/215 can have control TLVs before the message.
    // Reserved-memory layouts need a different reader, not guessed offsets.
    if (type == 2) return Result::Unsupported;
    if (type == 1 && length != 3) return Result::Malformed;
    p += length;
  }
  return Result::Empty;
}
} // namespace ndef
