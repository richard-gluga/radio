#pragma once
#include <stdint.h>

namespace radio {
inline bool elapsed(uint32_t now, uint32_t since, uint32_t duration) {
  return uint32_t(now - since) >= duration;
}
class Button {
  bool raw_ = false, stable_ = false;
  uint32_t changed_ = 0;
public:
  // One event per press; unsigned subtraction remains valid over millis wrap.
  bool update(bool pressed, uint32_t now) {
    if (pressed != raw_) { raw_ = pressed; changed_ = now; }
    if (stable_ != raw_ && elapsed(now, changed_, 35)) {
      stable_ = raw_;
      return stable_;
    }
    return false;
  }
};
class Volume {
  int filtered_ = -1, output_ = 0;
public:
  int update(int adc, int cap) {
    if (adc < 0) adc = 0;
    if (adc > 4095) adc = 4095;
    if (cap < 0) cap = 0;
    if (cap > 21) cap = 21;
    filtered_ = filtered_ < 0 ? adc : (filtered_ * 3 + adc) / 4;
    // A small dead band around boundaries prevents volume-overlay flicker.
    const int scaled = filtered_ * cap;
    if (scaled > output_ * 4095 + 2457 || scaled < output_ * 4095 - 2457)
      output_ = (scaled + 2047) / 4095;
    if (filtered_ < 40) output_ = 0;
    if (output_ > cap) output_ = cap;
    return output_;
  }
};
inline uint32_t retryDelay(unsigned failures) {
  return failures == 0 ? 2000 : failures == 1 ? 5000 : failures == 2 ? 10000 : 30000;
}
enum class EndResult { StationLost, NeverStarted, Early, Ended };
inline EndResult classifyEnd(bool story, bool started, uint32_t seconds, uint32_t duration) {
  if (!story) return EndResult::StationLost;
  if (!started) return EndResult::NeverStarted;
  // Library times are approximate. Even an on-time EOF is not proof of a
  // complete download; call it End, never certify that the story completed.
  if (duration > seconds && duration - seconds > 2) return EndResult::Early;
  return EndResult::Ended;
}
} // namespace radio
