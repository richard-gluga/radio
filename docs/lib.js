// Original browser helpers; no credentials are stored or sent to a server.
const utf8 = new TextEncoder();

export function cppString(value) {
  // Fixed-width octal avoids C++ hex escapes consuming the following character.
  return '"' + [...utf8.encode(value)].map(byte => {
    if (byte === 34) return '\\"';
    if (byte === 92) return '\\\\';
    return byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '\\' + byte.toString(8).padStart(3, '0');
  }).join('') + '"';
}

export function configuration(values, stationCount = 6) {
  const {ssid, password, backupSsid, backupPassword, mode} = values;
  if (!['test', 'radio'].includes(mode)) throw new Error('Choose Hardware test or Normal radio.');
  for (const [label, name, pass, required] of [
    ['Home', ssid, password, mode === 'radio'], ['Backup', backupSsid, backupPassword, false]
  ]) {
    const length = utf8.encode(name).length;
    if (required && !length) throw new Error(`${label} Wi-Fi name is required for Normal radio.`);
    if (length > 32 || /[\x00-\x1f\x7f]/.test(name)) throw new Error(`${label} Wi-Fi name must be at most 32 UTF-8 bytes without control characters.`);
    if (!name && pass) throw new Error(`${label} password needs a Wi-Fi name.`);
    const passLength = utf8.encode(pass).length;
    if (name && passLength && !((passLength >= 8 && passLength <= 63) || /^[a-fA-F0-9]{64}$/.test(pass)))
      throw new Error(`${label} password must be empty, 8–63 UTF-8 bytes, or a 64-digit hexadecimal key.`);
    if (/[\x00-\x1f\x7f]/.test(pass)) throw new Error(`${label} password contains a control character.`);
  }
  const cap = Number(values.cap), station = Number(values.startup);
  if (!Number.isInteger(cap) || cap < 0 || cap > 21) throw new Error('Volume must be a whole number from 0 to 21.');
  if (!Number.isInteger(station) || station < 0 || station >= stationCount) throw new Error('Choose a listed startup station.');
  return `#pragma once
// Private configuration: this file contains your Wi-Fi credentials.
constexpr char WIFI_SSID[] = ${cppString(ssid || 'YOUR_WIFI_SSID')};
constexpr char WIFI_PASSWORD[] = ${cppString(password)};
constexpr char BACKUP_WIFI_SSID[] = ${cppString(backupSsid)};
constexpr char BACKUP_WIFI_PASSWORD[] = ${cppString(backupPassword)};
constexpr unsigned START_STATION = ${station};
// Software steps, not a measured sound-pressure limit.
constexpr unsigned MAX_VOLUME = ${cap};
constexpr bool HARDWARE_TEST = ${mode === 'test'};
`;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function zipFiles(files) {
  // Standard ZIP stored entries (no compression), UTF-8 paths, CRC32 per file.
  const chunks = [], directory = [];
  let offset = 0, directorySize = 0;
  for (const [path, content] of Object.entries(files)) {
    const name = utf8.encode(path), data = typeof content === 'string' ? utf8.encode(content) : content;
    const crc = crc32(data);
    const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
    h.setUint16(12, 23585, true); h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
    header.set(name, 30);
    const entry = new Uint8Array(46 + name.length), e = new DataView(entry.buffer);
    e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x800, true);
    e.setUint16(14, 23585, true); e.setUint32(16, crc, true);
    e.setUint32(20, data.length, true); e.setUint32(24, data.length, true); e.setUint16(28, name.length, true);
    e.setUint32(42, offset, true); entry.set(name, 46);
    chunks.push(header, data); directory.push(entry);
    offset += header.length + data.length; directorySize += entry.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, directory.length, true); e.setUint16(10, directory.length, true);
  e.setUint32(12, directorySize, true); e.setUint32(16, offset, true);
  return new Blob([...chunks, ...directory, end], {type: 'application/zip'});
}

export class PlaybackSession {
  constructor() { this.id = 0; this.cleanup = null; }
  stop() { ++this.id; this.cleanup?.(); this.cleanup = null; }
  begin(cleanup) { this.stop(); this.cleanup = cleanup; return this.id; }
  current(id) { return this.id === id; }
}
