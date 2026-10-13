#pragma once
// Browser station data is generated from this canonical list by build_site.py.
struct Station { const char* name; const char* url; const char* page; };
constexpr Station STATIONS[] = {
  {"ABC Kids listen", "https://streaming.abc-cdn.net.au/audio/hls/abcextra.m3u8?source=web", "https://www.abc.net.au/listen/live/kidslisten"},
  {"Fun Kids UK", "https://listen-funkids.sharp-stream.com/funkids.mp3", "https://www.funkidslive.com/"},
  {"Fun Kids Junior", "https://listen-funkids.sharp-stream.com/funkidsjunior.mp3", "https://www.funkidslive.com/"},
  {"Rock the Cradle", "https://rockthecradle.stream.publicradio.org/rockthecradle.mp3", "https://www.thecurrent.org/playlist/rockthecradle"},
  {"Positively Sleep", "https://streaming.positivity.radio/pr/sleepkids/icecast.audio", "https://positivity.radio/"},
  {"ABC Classic", "https://streaming.abc-cdn.net.au/audio/hls/classicfmnsw.m3u8?source=web", "https://www.abc.net.au/listen/live/classic"}
};
constexpr unsigned STATION_COUNT = sizeof(STATIONS) / sizeof(STATIONS[0]);
