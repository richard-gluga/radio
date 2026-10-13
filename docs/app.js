import {configuration, zipFiles, PlaybackSession} from './lib.js';
const $ = id => document.getElementById(id);
const status = (id, message, error = false) => { $(id).textContent = message; $(id).classList.toggle('error', error); };
let stations = [];

async function fetchOk(url) {
  const response = await fetch(url, {cache: 'no-cache'});
  if (!response.ok) throw new Error(`Cannot load ${url} (HTTP ${response.status}).`);
  return response;
}

$('config-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const values = Object.fromEntries(new FormData(event.currentTarget));
  let config;
  try { config = configuration(values, stations.length || 6); }
  catch (error) { status('config-status', error.message, true); return; }
  button.disabled = true;
  status('config-status', 'Preparing the complete sketch…');
  try {
    const manifest = await (await fetchOk('downloads/manifest.json')).json();
    const entries = await Promise.all(manifest.files.map(async item => {
      if (!/^[A-Za-z0-9_]+\.(ino|h)$/.test(item.name)) throw new Error('Unexpected filename in download manifest.');
      const data = new Uint8Array(await (await fetchOk(`downloads/${manifest.folder}/${item.name}`)).arrayBuffer());
      if (crypto.subtle) {
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(b => b.toString(16).padStart(2, '0')).join('');
        if (hash !== item.sha256) throw new Error('The site was updated during download. Reload and try again.');
      }
      return [`${manifest.folder}/${item.name}`, item.name === 'RadioConfig.h' ? config : data];
    }));
    const blob = zipFiles(Object.fromEntries(entries));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'KangarooRadio_ABCKids.zip';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status('config-status', 'Downloaded. Extract the ZIP, open its .ino in Arduino IDE, and follow section 4. Keep the configured files private.');
  } catch (error) {
    status('config-status', `${error.message} Use the unconfigured ZIP below and edit RadioConfig.h if needed. Open the guide over HTTPS or a local web server.`, true);
  } finally { button.disabled = false; }
});

const session = new PlaybackSession();
function stopPlayer() {
  session.stop();
  $('player').hidden = true;
  status('player-status', 'Stopped.');
}
$('stop-audio').addEventListener('click', stopPlayer);
window.addEventListener('pagehide', () => session.stop());

function playSource(url, title) {
  const parsed = new URL(url, document.baseURI);
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    status('player-status', 'Use a public HTTP or HTTPS audio URL.', true); return;
  }
  if (location.protocol === 'https:' && parsed.protocol === 'http:') {
    status('player-status', 'This HTTPS page cannot reliably preview HTTP audio. Use an HTTPS file.', true); return;
  }
  let hls = null, timeout = null;
  const events = new AbortController();
  const audio = document.createElement('audio');
  audio.id = 'audio'; audio.controls = true; audio.preload = 'none'; audio.volume = 0.25;
  const id = session.begin(() => {
    events.abort(); clearTimeout(timeout);
    hls?.destroy(); audio.pause(); audio.removeAttribute('src'); audio.load();
  });
  $('audio').replaceWith(audio);
  $('player-title').textContent = title;
  $('player').hidden = false;
  status('player-status', `Loading ${title}…`);
  const showError = message => {
    if (!session.current(id)) return;
    session.stop();
    status('player-status', message + ' Choose the source again to retry, or use its official player.', true);
  };
  const listen = (name, fn) => audio.addEventListener(name, () => { if (session.current(id)) fn(); }, {signal: events.signal});
  listen('playing', () => { clearTimeout(timeout); status('player-status', `Playing ${title}.`); });
  listen('waiting', () => status('player-status', `Buffering ${title}…`));
  listen('pause', () => { if (!audio.ended) status('player-status', `Paused ${title}.`); });
  listen('ended', () => { clearTimeout(timeout); status('player-status', `${title} ended.`); });
  listen('error', () => showError('Audio could not load. The URL, format, network or browser restrictions may be responsible.'));
  const start = () => {
    if (!session.current(id)) return;
    audio.play().catch(error => {
      if (!session.current(id)) return;
      if (error.name === 'NotAllowedError') {
        clearTimeout(timeout);
        status('player-status', 'The browser requires another gesture. Press Play in the audio controls.');
      } else showError('Playback failed.');
    });
  };
  timeout = setTimeout(() => showError('Audio did not start within 25 seconds.'), 25000);
  const isHls = /\.m3u8(?:[?#]|$)/i.test(parsed.href);
  if (isHls && !audio.canPlayType('application/vnd.apple.mpegurl')) {
    if (!window.Hls?.isSupported()) { showError('This browser does not support this HLS stream.'); return; }
    hls = new window.Hls({manifestLoadingMaxRetry: 1, levelLoadingMaxRetry: 1});
    hls.on(window.Hls.Events.ERROR, (_, data) => { if (data.fatal) showError('The HLS stream could not be loaded.'); });
    hls.on(window.Hls.Events.MANIFEST_PARSED, start);
    hls.loadSource(parsed.href); hls.attachMedia(audio);
  } else { audio.src = parsed.href; start(); }
}

$('play-demo').addEventListener('click', () => playSource('assets/audio-check.wav', 'Five-second audio check'));
$('custom-form').addEventListener('submit', event => {
  event.preventDefault();
  try { playSource($('custom-url').value.trim(), 'Your audio'); }
  catch { status('player-status', 'Enter a complete public HTTP or HTTPS URL.', true); }
});
$('copy-demo').addEventListener('click', async () => {
  const url = new URL('assets/audio-check.wav', document.baseURI).href;
  $('demo-url-label').hidden = false; $('demo-url').value = url;
  if (!['http:', 'https:'].includes(location.protocol) || ['localhost', '127.0.0.1'].includes(location.hostname)) {
    status('player-status', 'This preview address is local to your computer. Publish the site or use a public hosted file before writing a tag.', true); return;
  }
  try {
    await navigator.clipboard.writeText(url);
    status('player-status', 'Demo URL copied. Open it on your phone to verify it, then write one URL/URI record.');
  } catch {
    $('demo-url').focus(); $('demo-url').select();
    status('player-status', 'Automatic copy is unavailable. Copy the selected URL below.');
  }
});

try {
  stations = await (await fetchOk('stations.json')).json();
  $('startup').replaceChildren();
  for (const [index, station] of stations.entries()) {
    const option = document.createElement('option'); option.value = index; option.textContent = station.name; $('startup').append(option);
    const card = document.createElement('div'); card.className = 'station-card';
    const name = document.createElement('h3'); name.textContent = station.name;
    const play = document.createElement('button'); play.type = 'button'; play.textContent = 'Listen'; play.setAttribute('aria-label', `Listen to ${station.name}`);
    play.addEventListener('click', () => playSource(station.url, station.name));
    const link = document.createElement('a'); link.href = station.page; link.textContent = 'Official player';
    card.append(name, play, link); $('stations').append(card);
  }
} catch (error) { status('player-status', `${error.message} The static build instructions and unconfigured download are still available.`, true); }
