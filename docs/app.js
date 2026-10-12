// Kangaroo Radio — Interactive Client Logic
document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. SHOPPING CHECKLIST & BUDGET CALCULATOR
  // ==========================================
  const checkboxes = document.querySelectorAll('.part-checkbox');
  const totalDisplay = document.getElementById('budget-total-display');
  const countDisplay = document.getElementById('budget-count-display');
  const btnSelectAll = document.getElementById('btn-select-all-parts');
  const storeTabs = document.querySelectorAll('.filter-tab');
  const tableRows = document.querySelectorAll('.table-body .table-row');

  function updateBudget() {
    let checkedCount = 0;
    let totalCost = 0;

    checkboxes.forEach(cb => {
      const price = parseFloat(cb.dataset.price) || 0;
      totalCost += price;
      const row = cb.closest('.table-row');
      if (cb.checked) {
        checkedCount++;
        row.classList.add('checked');
      } else {
        row.classList.remove('checked');
      }
    });

    totalDisplay.textContent = `$${totalCost.toFixed(2)} AUD`;
    countDisplay.textContent = `(${checkedCount} of ${checkboxes.length} items collected)`;
    
    if (checkedCount === checkboxes.length) {
      btnSelectAll.textContent = 'Uncheck All';
    } else {
      btnSelectAll.textContent = 'Mark All Collected';
    }
  }

  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateBudget);
  });

  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', () => {
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => {
        cb.checked = !allChecked;
      });
      updateBudget();
    });
  }

  // Store Filter Tabs
  storeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      storeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const store = tab.dataset.store;
      tableRows.forEach(row => {
        const rowStores = row.dataset.store || '';
        if (store === 'all' || rowStores.includes(store)) {
          row.style.display = 'grid';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });

  updateBudget();

  // ==========================================
  // 2. LIVE CODE GENERATOR & COPY TO CLIPBOARD
  // ==========================================
  const inputSsid = document.getElementById('input-ssid');
  const inputPass = document.getElementById('input-password');
  const inputVol = document.getElementById('input-volume');
  const volDisplay = document.getElementById('vol-display-val');

  const codeSsid = document.getElementById('code-ssid');
  const codePass = document.getElementById('code-pass');
  const codeVol = document.getElementById('code-vol');
  const selectStation = document.getElementById('select-startup-station');
  const codeStartup = document.getElementById('code-startup-station');
  const selectVolumeCap = document.getElementById('select-volume-cap');
  const codeVolumeCap = document.getElementById('code-volume-cap');
  const btnCopy = document.getElementById('btn-copy-code');

  function updateCodePreview() {
    const ssid = inputSsid ? (inputSsid.value.trim() || 'MyHomeWiFi') : 'MyHomeWiFi';
    const pass = inputPass ? (inputPass.value || 'SecretPassword123') : 'SecretPassword123';
    const vol = inputVol ? (inputVol.value || '14') : '14';
    const startStation = selectStation ? selectStation.value : '0';
    const volCap = selectVolumeCap ? selectVolumeCap.value : '14';

    if (codeSsid) codeSsid.textContent = ssid;
    if (codePass) codePass.textContent = pass;
    if (codeVol) codeVol.textContent = vol;
    if (codeStartup) codeStartup.textContent = startStation;
    if (codeVolumeCap) codeVolumeCap.textContent = volCap;
    if (volDisplay) volDisplay.textContent = `${vol} / 21`;
  }

  if (inputSsid) inputSsid.addEventListener('input', updateCodePreview);
  if (inputPass) inputPass.addEventListener('input', updateCodePreview);
  if (inputVol) inputVol.addEventListener('input', updateCodePreview);
  if (selectStation) selectStation.addEventListener('change', updateCodePreview);
  if (selectVolumeCap) selectVolumeCap.addEventListener('change', updateCodePreview);

  // ==========================================
  // STATION CYCLE SIMULATOR WIDGET
  // ==========================================
  const btnCycle = document.getElementById('btn-simulate-station-cycle');
  const cycleName = document.getElementById('cycle-station-name');
  const stationCards = document.querySelectorAll('.station-card');

  const stationList = [
    "1. ABC Kids listen (Australia)",
    "2. Fun Kids UK (Live)",
    "3. Fun Kids Junior (Toddlers)",
    "4. Rock the Cradle (MPR Kids)",
    "5. Positively Sleep Kids (Lullabies)",
    "6. ABC Classic (NSW)"
  ];
  let currentSimStation = 0;

  function playChirp() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch(e) {}
  }

  if (btnCycle && cycleName) {
    btnCycle.addEventListener('click', () => {
      currentSimStation = (currentSimStation + 1) % stationList.length;
      cycleName.textContent = stationList[currentSimStation];

      // Highlight active card
      stationCards.forEach(card => {
        const idx = parseInt(card.dataset.stationIndex, 10);
        if (idx === currentSimStation) {
          card.classList.add('active-station');
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          card.classList.remove('active-station');
        }
      });

      // Also update the simulated OLED screen to match
      const stationTitles = [
        "ABC Kids listen",
        "Fun Kids UK",
        "Fun Kids Junior",
        "Rock the Cradle",
        "Positively Sleep",
        "ABC Classic"
      ];
      const stationGenres = [
        "Preschool & Aussie Stories",
        "Pop, Stories & Quizzes",
        "Gentle Nursery Rhymes (0-4)",
        "Indie Music for Families",
        "Calm Lullabies & Ambient",
        "Peaceful Classical for Play"
      ];
      if (simTopBar && simLine1 && simLine2 && simLine3) {
        simTopBar.classList.remove('error-top');
        simTopTag.textContent = 'WIFI OK';
        simTopVol.textContent = 'VOL: 67%';
        simLine1.textContent = `STATION [${currentSimStation + 1}/6]`;
        simLine2.textContent = stationTitles[currentSimStation];
        simLine3.textContent = stationGenres[currentSimStation];
        simBottom.innerHTML = `<div class="oled-equalizer animating"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>`;
        oledButtons.forEach(b => b.classList.remove('active'));
      }

      playChirp();
    });
  }

  // ==========================================
  // MONOCHROME OLED DISPLAY SIMULATOR
  // ==========================================
  const oledButtons = document.querySelectorAll('.btn-oled-state');
  const simTopBar = document.getElementById('sim-oled-topbar');
  const simTopTag = document.getElementById('sim-oled-top-tag');
  const simTopVol = document.getElementById('sim-oled-top-vol');
  const simLine1 = document.getElementById('sim-oled-line1');
  const simLine2 = document.getElementById('sim-oled-line2');
  const simLine3 = document.getElementById('sim-oled-line3');
  const simBottom = document.getElementById('sim-oled-bottom');

  function renderOledState(state) {
    if (!simTopBar || !simLine1 || !simLine2 || !simLine3 || !simBottom) return;

    simTopBar.classList.remove('error-top');
    const currentSsid = (inputSsid && inputSsid.value.trim()) ? inputSsid.value.trim() : 'MyHomeWiFi';

    switch (state) {
      case 'playing-abc':
        simTopTag.textContent = 'WIFI OK';
        simTopVol.textContent = 'VOL: 67%';
        simLine1.textContent = 'STATION [1/6]';
        simLine2.textContent = 'ABC Kids listen';
        simLine3.textContent = 'Preschool & Aussie Stories';
        simBottom.innerHTML = `<div class="oled-equalizer animating"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>`;
        break;

      case 'playing-funkids':
        simTopTag.textContent = 'WIFI OK';
        simTopVol.textContent = 'VOL: 67%';
        simLine1.textContent = 'STATION [2/6]';
        simLine2.textContent = 'Fun Kids UK';
        simLine3.textContent = 'Pop, Stories & Quizzes';
        simBottom.innerHTML = `<div class="oled-equalizer animating"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>`;
        break;

      case 'connecting':
        simTopTag.textContent = 'KANGAROO RADIO';
        simTopVol.textContent = 'BOOT';
        simLine1.textContent = 'Connecting to Wi-Fi...';
        simLine2.textContent = `SSID: ${currentSsid}`;
        simLine3.textContent = 'Negotiating DHCP IP...';
        simBottom.innerHTML = `<div class="oled-progress-track"><div class="oled-progress-fill" style="width: 62%;"></div></div>`;
        break;

      case 'err-notfound':
        simTopBar.classList.add('error-top');
        simTopTag.textContent = '[ ! ] WI-FI ERROR';
        simTopVol.textContent = 'ALERT';
        simLine1.textContent = 'Reason: SSID NOT FOUND';
        simLine2.textContent = `"${currentSsid}" not found`;
        simLine3.textContent = 'Check router & 2.4GHz band';
        simBottom.innerHTML = `<div style="font-size:0.65rem; color:#94a3b8; text-align:center; width:100%;">[ Check SSID / Router ]</div>`;
        break;

      case 'err-password':
        simTopBar.classList.add('error-top');
        simTopTag.textContent = '[ ! ] WI-FI ERROR';
        simTopVol.textContent = 'ALERT';
        simLine1.textContent = 'Reason: WRONG PASSWORD';
        simLine2.textContent = `Auth failed for "${currentSsid}"`;
        simLine3.textContent = 'Check Wi-Fi credentials';
        simBottom.innerHTML = `<div style="font-size:0.65rem; color:#94a3b8; text-align:center; width:100%;">[ Re-enter Credentials ]</div>`;
        break;

      case 'err-internet':
        simTopBar.classList.add('error-top');
        simTopTag.textContent = '[ ! ] STREAM ERROR';
        simTopVol.textContent = 'ALERT';
        simLine1.textContent = 'Reason: NO INTERNET';
        simLine2.textContent = 'Connected to Wi-Fi OK';
        simLine3.textContent = 'Stream server unreachable';
        simBottom.innerHTML = `<div style="font-size:0.65rem; color:#94a3b8; text-align:center; width:100%;">[ Retrying in 5s... ]</div>`;
        break;

      case 'volume-adjust':
        simTopTag.textContent = 'MASTER VOLUME';
        simTopVol.textContent = 'LEVEL: 14/21';
        simLine1.textContent = 'Volume: 14 / 21 (67%)';
        simLine2.innerHTML = `<div class="oled-progress-track" style="height:10px; margin: 3px 0;"><div class="oled-progress-fill" style="width: 67%; height:100%;"></div></div>`;
        simLine3.textContent = 'ABC Kids listen';
        simBottom.innerHTML = `<div style="font-size:0.65rem; color:#93c5fd; text-align:center; width:100%;">[ Rotary Dial Turned ]</div>`;
        break;
    }
  }

  oledButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      oledButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const state = btn.dataset.state;
      renderOledState(state);
      playChirp();
    });
  });

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const codeElement = document.getElementById('code-display');
      if (!codeElement) return;

      const codeText = codeElement.innerText;
      navigator.clipboard.writeText(codeText).then(() => {
        const copyText = btnCopy.querySelector('.copy-text');
        const originalText = copyText.textContent;
        copyText.textContent = 'Copied! 🎉';
        btnCopy.style.borderColor = 'var(--accent-green)';
        btnCopy.style.color = '#86efac';

        setTimeout(() => {
          copyText.textContent = originalText;
          btnCopy.style.borderColor = '';
          btnCopy.style.color = '';
        }, 2200);
      }).catch(err => {
        console.error('Failed to copy code: ', err);
      });
    });
  }

  // ==========================================
  // 3. INTERACTIVE WIRING & PINOUT HIGHLIGHTS
  // ==========================================
  const pinRows = document.querySelectorAll('.pin-row:not(.header)');
  const wirePaths = document.querySelectorAll('.wire-path');

  pinRows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      const targetClass = row.dataset.target;
      if (!targetClass) return;

      wirePaths.forEach(wire => {
        if (wire.classList.contains(targetClass)) {
          wire.classList.add('highlighted');
        } else {
          wire.style.opacity = '0.25';
        }
      });
    });

    row.addEventListener('mouseleave', () => {
      wirePaths.forEach(wire => {
        wire.classList.remove('highlighted');
        wire.style.opacity = '';
      });
    });
  });

  // Clicking wires highlights matching table rows
  wirePaths.forEach(wire => {
    wire.addEventListener('click', () => {
      let matchedClass = '';
      wire.classList.forEach(cls => {
        if (cls.startsWith('wire-') && cls !== 'wire-path') {
          matchedClass = cls;
        }
      });

      pinRows.forEach(row => {
        if (row.dataset.target === matchedClass) {
          row.style.background = 'rgba(245, 158, 11, 0.25)';
          row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          setTimeout(() => {
            row.style.background = '';
          }, 1500);
        }
      });
    });
  });

  // ==========================================
  // 4. INTERACTIVE ACOUSTIC SOUND SIMULATOR
  // ==========================================
  const btnBare = document.getElementById('btn-sound-bare');
  const btnEnclosed = document.getElementById('btn-sound-enclosed');
  const waveformVisual = document.getElementById('waveform-visual');
  const soundFeedback = document.getElementById('sound-feedback-text');

  let audioCtx = null;
  let isPlaying = false;
  let currentTimer = null;
  let activeNodes = [];

  function stopAudio() {
    activeNodes.forEach(node => {
      try { node.stop(); } catch(e){}
      try { node.disconnect(); } catch(e){}
    });
    activeNodes = [];
    if (waveformVisual) waveformVisual.classList.remove('playing');
    isPlaying = false;
    clearTimeout(currentTimer);
  }

  function playSimulatedAudio(mode) {
    stopAudio();

    // Initialize Web Audio API on user gesture
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isPlaying = true;
    if (waveformVisual) waveformVisual.classList.add('playing');

    // Melody: Twinkle Twinkle / Nursery tune (notes in Hz)
    const melody = [
      { note: 261.63, dur: 0.35 }, // C4
      { note: 261.63, dur: 0.35 }, // C4
      { note: 392.00, dur: 0.35 }, // G4
      { note: 392.00, dur: 0.35 }, // G4
      { note: 440.00, dur: 0.35 }, // A4
      { note: 440.00, dur: 0.35 }, // A4
      { note: 392.00, dur: 0.70 }, // G4
      { note: 349.23, dur: 0.35 }, // F4
      { note: 349.23, dur: 0.35 }, // F4
      { note: 329.63, dur: 0.35 }, // E4
      { note: 329.63, dur: 0.35 }, // E4
      { note: 293.66, dur: 0.35 }, // D4
      { note: 293.66, dur: 0.35 }, // D4
      { note: 261.63, dur: 0.80 }, // C4
    ];

    let startTime = audioCtx.currentTime + 0.05;

    // Filter pipeline based on enclosure mode
    const mainGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    if (mode === 'bare') {
      // Acoustic cancellation: Extreme bass rolloff, thin mid-peak
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(850, audioCtx.currentTime); // Cut everything under 850Hz!
      mainGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      if (soundFeedback) {
        soundFeedback.innerHTML = '⚠️ Simulating: <strong>Bare Speaker (Tinny & Hollow)</strong> — Notice how weak the bass notes sound due to phase cancellation!';
      }
    } else {
      // Enclosed box: Full spectrum warmth with gentle low-pass roll
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(4500, audioCtx.currentTime);
      
      // Warm low shelf boost
      const bassBoost = audioCtx.createBiquadFilter();
      bassBoost.type = 'lowshelf';
      bassBoost.frequency.setValueAtTime(320, audioCtx.currentTime);
      bassBoost.gain.setValueAtTime(6, audioCtx.currentTime);

      filter.connect(bassBoost);
      bassBoost.connect(mainGain);
      mainGain.gain.setValueAtTime(0.25, audioCtx.currentTime);

      if (soundFeedback) {
        soundFeedback.innerHTML = '✨ Simulating: <strong>Sealed Wooden Box (Warm & Full)</strong> — The enclosure traps the back wave, delivering rich, warm acoustic tone!';
      }
    }

    if (mode === 'bare') {
      filter.connect(mainGain);
    }
    mainGain.connect(audioCtx.destination);

    // Schedule musical notes
    melody.forEach(item => {
      const osc = audioCtx.createOscillator();
      const noteGain = audioCtx.createGain();

      // Warm triangle wave with slight harmonic richness
      osc.type = (mode === 'bare') ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(item.note, startTime);

      // Envelope
      noteGain.gain.setValueAtTime(0.001, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.8, startTime + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + item.dur - 0.05);

      osc.connect(noteGain);
      noteGain.connect(filter);

      osc.start(startTime);
      osc.stop(startTime + item.dur);
      activeNodes.push(osc);

      startTime += item.dur;
    });

    const totalDur = (startTime - audioCtx.currentTime) * 1000;
    currentTimer = setTimeout(() => {
      stopAudio();
    }, totalDur);
  }

  if (btnBare && btnEnclosed) {
    btnBare.addEventListener('click', () => {
      btnBare.classList.add('active');
      btnEnclosed.classList.remove('active');
      playSimulatedAudio('bare');
    });

    btnEnclosed.addEventListener('click', () => {
      btnEnclosed.classList.add('active');
      btnBare.classList.remove('active');
      playSimulatedAudio('enclosed');
    });
  }

  // ==========================================
  // 5. LIVE AUDIO STREAM PLAYERS & SAMPLING
  // ==========================================
  const sampleButtons = document.querySelectorAll('.btn-sample-stream');
  const livePlayerBar = document.getElementById('live-player-bar');
  const playerStationTitle = document.getElementById('player-station-title');
  const playerStationStatus = document.getElementById('player-station-status');
  const playerBtnToggle = document.getElementById('player-btn-toggle');
  const playerBtnPrev = document.getElementById('player-btn-prev');
  const playerBtnNext = document.getElementById('player-btn-next');
  const playerVolSlider = document.getElementById('player-vol-slider');
  const playerBtnClose = document.getElementById('player-btn-close');

  let activeStreamAudio = null;
  let activeHls = null;
  let currentActiveIndex = -1;
  let isStreamPlaying = false;

  const stationStreamList = [
    { title: "ABC Kids listen", url: "https://streaming.abc-cdn.net.au/audio/hls/abcextra.m3u8?source=web", type: "hls", genre: "Preschool Stories & Aussie Music" },
    { title: "Fun Kids UK", url: "https://listen-funkids.sharp-stream.com/funkids.mp3", type: "audio", genre: "Upbeat Kids Hits, Science & Fun" },
    { title: "Fun Kids Junior", url: "https://listen-funkids.sharp-stream.com/funkidsjunior.mp3", type: "audio", genre: "Nursery Rhymes & Gentle Stories" },
    { title: "Rock the Cradle (MPR)", url: "https://rockthecradle.stream.publicradio.org/rockthecradle.mp3", type: "audio", genre: "Indie Music for Kids & Parents" },
    { title: "Positively Sleep Kids", url: "https://streaming.positivity.radio/pr/sleepkids/icecast.audio", type: "audio", genre: "Lullabies & Ambient Sleep Music" },
    { title: "ABC Classic (NSW)", url: "https://streaming.abc-cdn.net.au/audio/hls/classicfmnsw.m3u8?source=web", type: "hls", genre: "Peaceful Classical for Craft & Study" }
  ];

  function stopCurrentStream() {
    if (activeHls) {
      try { activeHls.destroy(); } catch(e) {}
      activeHls = null;
    }
    if (activeStreamAudio) {
      try {
        activeStreamAudio.pause();
        activeStreamAudio.src = '';
      } catch(e) {}
      activeStreamAudio = null;
    }
    isStreamPlaying = false;

    // Reset button states
    sampleButtons.forEach(btn => {
      btn.classList.remove('playing');
      const textSpan = btn.querySelector('.sample-text');
      const iconSpan = btn.querySelector('.sample-icon');
      if (textSpan) textSpan.textContent = 'Listen Live Sample';
      if (iconSpan) iconSpan.textContent = '▶';
    });

    if (playerBtnToggle) playerBtnToggle.textContent = '▶';
  }

  function playStationByIndex(index) {
    if (index < 0 || index >= stationStreamList.length) return;
    const st = stationStreamList[index];

    // If clicking same station that is already playing, toggle pause
    if (currentActiveIndex === index && activeStreamAudio && isStreamPlaying) {
      activeStreamAudio.pause();
      isStreamPlaying = false;
      if (playerBtnToggle) playerBtnToggle.textContent = '▶';
      sampleButtons.forEach(b => {
        if (parseInt(b.dataset.stationIndex, 10) === index) {
          b.classList.remove('playing');
          b.querySelector('.sample-text').textContent = 'Resume Sample';
          b.querySelector('.sample-icon').textContent = '▶';
        }
      });
      if (playerStationStatus) playerStationStatus.textContent = '⏸ Paused';
      return;
    }

    // Stop current stream if different or stopped
    stopCurrentStream();
    currentActiveIndex = index;

    // Show floating bar
    if (livePlayerBar) livePlayerBar.classList.remove('hidden');
    if (playerStationTitle) playerStationTitle.textContent = st.title;
    if (playerStationStatus) playerStationStatus.textContent = 'Connecting...';
    if (playerBtnToggle) playerBtnToggle.textContent = '⏸';

    const btn = Array.from(sampleButtons).find(b => parseInt(b.dataset.stationIndex, 10) === index);
    if (btn) {
      btn.classList.add('playing');
      btn.querySelector('.sample-text').textContent = 'Buffering Live...';
      btn.querySelector('.sample-icon').textContent = '⏳';
    }

    // Update the OLED Simulator on the page as well!
    if (typeof renderOledState === 'function') {
      simTopBar.classList.remove('error-top');
      simTopTag.textContent = 'WIFI OK';
      simTopVol.textContent = 'LIVE';
      simLine1.textContent = `STATION [${index + 1}/6]`;
      simLine2.textContent = st.title;
      simLine3.textContent = st.genre;
      simBottom.innerHTML = `<div class="oled-equalizer animating"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>`;
    }

    // Create audio element
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    const vol = playerVolSlider ? parseFloat(playerVolSlider.value) : 0.8;
    audio.volume = vol;
    activeStreamAudio = audio;

    const onAudioReady = () => {
      audio.play().then(() => {
        isStreamPlaying = true;
        if (playerStationStatus) playerStationStatus.textContent = '🔴 LIVE STREAMING';
        if (playerBtnToggle) playerBtnToggle.textContent = '⏸';
        if (btn) {
          btn.querySelector('.sample-text').textContent = 'Pause Sample';
          btn.querySelector('.sample-icon').textContent = '⏸';
        }
      }).catch(err => {
        console.warn('Auto-play blocked or error: ', err);
        if (playerStationStatus) playerStationStatus.textContent = 'Click to Play';
        if (playerBtnToggle) playerBtnToggle.textContent = '▶';
        if (btn) {
          btn.querySelector('.sample-text').textContent = 'Listen Live Sample';
          btn.querySelector('.sample-icon').textContent = '▶';
        }
      });
    };

    if (st.type === 'hls' && window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30
      });
      activeHls = hls;
      hls.loadSource(st.url);
      hls.attachMedia(audio);
      hls.on(window.Hls.Events.MANIFEST_PARSED, onAudioReady);
      hls.on(window.Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn('HLS error: ', data);
          if (playerStationStatus) playerStationStatus.textContent = 'Stream error / offline';
        }
      });
    } else {
      // Native audio
      audio.src = st.url;
      audio.addEventListener('canplay', onAudioReady, { once: true });
      audio.load();
    }
  }

  sampleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = parseInt(btn.dataset.stationIndex, 10);
      playStationByIndex(idx);
    });
  });

  if (playerBtnToggle) {
    playerBtnToggle.addEventListener('click', () => {
      if (!activeStreamAudio && currentActiveIndex >= 0) {
        playStationByIndex(currentActiveIndex);
        return;
      }
      if (activeStreamAudio) {
        if (isStreamPlaying) {
          activeStreamAudio.pause();
          isStreamPlaying = false;
          playerBtnToggle.textContent = '▶';
          if (playerStationStatus) playerStationStatus.textContent = '⏸ Paused';
          const activeBtn = Array.from(sampleButtons).find(b => parseInt(b.dataset.stationIndex, 10) === currentActiveIndex);
          if (activeBtn) {
            activeBtn.classList.remove('playing');
            activeBtn.querySelector('.sample-text').textContent = 'Resume Sample';
            activeBtn.querySelector('.sample-icon').textContent = '▶';
          }
        } else {
          activeStreamAudio.play().then(() => {
            isStreamPlaying = true;
            playerBtnToggle.textContent = '⏸';
            if (playerStationStatus) playerStationStatus.textContent = '🔴 LIVE STREAMING';
            const activeBtn = Array.from(sampleButtons).find(b => parseInt(b.dataset.stationIndex, 10) === currentActiveIndex);
            if (activeBtn) {
              activeBtn.classList.add('playing');
              activeBtn.querySelector('.sample-text').textContent = 'Pause Sample';
              activeBtn.querySelector('.sample-icon').textContent = '⏸';
            }
          });
        }
      }
    });
  }

  if (playerBtnPrev) {
    playerBtnPrev.addEventListener('click', () => {
      const prevIdx = (currentActiveIndex - 1 + stationStreamList.length) % stationStreamList.length;
      playStationByIndex(prevIdx);
    });
  }

  if (playerBtnNext) {
    playerBtnNext.addEventListener('click', () => {
      const nextIdx = (currentActiveIndex + 1) % stationStreamList.length;
      playStationByIndex(nextIdx);
    });
  }

  const btnToggleSafeVol = document.getElementById('btn-toggle-safe-vol');
  const playerVolPct = document.getElementById('player-vol-pct');
  let isKidSafeVolumeCapped = true; // Enabled by default to protect little ears

  function applyVolumeSafety(val) {
    let effectiveVal = val;
    if (isKidSafeVolumeCapped && effectiveVal > 0.65) {
      effectiveVal = 0.65;
      if (playerVolSlider) playerVolSlider.value = 0.65;
    }
    if (activeStreamAudio) {
      try { activeStreamAudio.volume = effectiveVal; } catch(e) {}
    }
    if (playerVolPct) {
      const pct = Math.round(effectiveVal * 100);
      playerVolPct.textContent = isKidSafeVolumeCapped ? `${pct}% [SAFE]` : `${pct}%`;
    }
    if (typeof window.update3dRadioOled === 'function') {
      window.update3dRadioOled(0);
    }
  }

  if (btnToggleSafeVol) {
    btnToggleSafeVol.addEventListener('click', () => {
      isKidSafeVolumeCapped = !isKidSafeVolumeCapped;
      btnToggleSafeVol.classList.toggle('unlocked', !isKidSafeVolumeCapped);
      const icon = btnToggleSafeVol.querySelector('.safe-icon');
      const label = btnToggleSafeVol.querySelector('.safe-label');
      if (isKidSafeVolumeCapped) {
        if (icon) icon.textContent = '🔒';
        if (label) label.textContent = 'Safe Cap (65%)';
        btnToggleSafeVol.title = 'Child-Safe Volume Cap Active (~75 dBA safe limit)';
        if (playerVolSlider && parseFloat(playerVolSlider.value) > 0.65) {
          playerVolSlider.value = 0.65;
        }
      } else {
        if (icon) icon.textContent = '🔓';
        if (label) label.textContent = 'Unlocked (100%)';
        btnToggleSafeVol.title = 'Warning: Volume cap disabled. Full volume enabled.';
      }
      if (playerVolSlider) applyVolumeSafety(parseFloat(playerVolSlider.value));
    });
  }

  if (playerVolSlider) {
    playerVolSlider.addEventListener('input', () => {
      applyVolumeSafety(parseFloat(playerVolSlider.value));
    });
  }

  if (playerBtnClose) {
    playerBtnClose.addEventListener('click', () => {
      stopCurrentStream();
      currentActiveIndex = -1;
      if (livePlayerBar) livePlayerBar.classList.add('hidden');
    });
  }

  // ==========================================
  // 6. THREE.JS INTERACTIVE 3D RADIO EXPLORER
  // ==========================================
  function initThreeJsRadio() {
    const container = document.getElementById('threejs-canvas-container');
    if (!container || !window.THREE) return;

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 500;

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a101e, 0.08);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Orbit Controls
    let controls = null;
    if (window.THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 3.2;
      controls.maxDistance = 8.0;
      controls.maxPolarAngle = Math.PI / 2 + 0.15;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.0;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-6, 3, -4);
    scene.add(fillLight);

    // Subtle blue point light glowing near OLED screen
    const oledLight = new THREE.PointLight(0x38bdf8, 2.2, 2.8);
    oledLight.position.set(0.75, 0.42, 1.15);
    scene.add(oledLight);

    // Procedural Wood Texture Canvas
    function createWoodTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#b77341';
      ctx.fillRect(0, 0, 512, 512);

      // Grain lines
      for (let i = 0; i < 512; i += 2) {
        const v = Math.sin(i * 0.08) * 15 + Math.random() * 8;
        ctx.fillStyle = `rgba(139, 74, 30, ${0.12 + Math.random() * 0.15})`;
        ctx.fillRect(0, i + v, 512, 2);
      }
      ctx.fillStyle = 'rgba(105, 50, 18, 0.2)';
      ctx.beginPath();
      ctx.ellipse(180, 260, 40, 16, 0.2, 0, Math.PI * 2);
      ctx.fill();

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    // Procedural Speaker Fabric Cloth Texture
    function createFabricTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#3a312a';
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = '#a8947f';
      for (let x = 0; x < 256; x += 8) {
        for (let y = 0; y < 256; y += 8) {
          if ((x + y) % 16 === 0) {
            ctx.fillRect(x, y, 6, 6);
          }
        }
      }
      return new THREE.CanvasTexture(canvas);
    }

    // Dynamic 3D Monochrome OLED Canvas Texture (High DPI 512 x 256)
    const oledCanvas = document.createElement('canvas');
    oledCanvas.width = 512;
    oledCanvas.height = 256;
    const oledCtx = oledCanvas.getContext('2d');
    const oledTexture = new THREE.CanvasTexture(oledCanvas);
    oledTexture.minFilter = THREE.LinearFilter;
    oledTexture.magFilter = THREE.LinearFilter;

    function updateOledCanvas(tick) {
      // 1. Pitch Black OLED Panel Background
      oledCtx.fillStyle = '#02050c';
      oledCtx.fillRect(0, 0, 512, 256);

      // Subtle OLED scanline raster effect
      oledCtx.fillStyle = 'rgba(56, 189, 248, 0.03)';
      for (let y = 0; y < 256; y += 4) {
        oledCtx.fillRect(0, y, 512, 1);
      }

      // Station info & live audio state
      const stationIdx = currentActiveIndex >= 0 ? currentActiveIndex : 0;
      const st = stationStreamList[stationIdx] || stationStreamList[0];
      const isPlaying = isStreamPlaying;

      // 2. Inverted Status Top Bar (Classic SSD1306)
      oledCtx.fillStyle = '#38bdf8';
      oledCtx.fillRect(0, 0, 512, 44);

      // Status Bar Text (Deep Navy Black on Vibrant Cyan)
      oledCtx.fillStyle = '#02050c';
      oledCtx.font = 'bold 22px monospace';
      oledCtx.fillText('WIFI: OK', 16, 30);

      // Child-Safe Volume Status
      const volText = isKidSafeVolumeCapped ? '🔒 SAFE 65%' : 'VOL: 80%';
      oledCtx.fillText(volText, 325, 30);

      // 3. Station Number / Live State
      oledCtx.fillStyle = '#38bdf8';
      oledCtx.font = 'bold 20px monospace';
      oledCtx.fillText(`STATION [${stationIdx + 1}/6] • ${isPlaying ? 'LIVE STREAM' : 'READY'}`, 16, 82);

      // 4. Main Station Title (Crisp White OLED Pixels)
      oledCtx.fillStyle = '#ffffff';
      oledCtx.font = 'bold 32px sans-serif';
      oledCtx.fillText(st.title, 16, 126);

      // 5. Genre Subtitle
      oledCtx.fillStyle = '#94a3b8';
      oledCtx.font = '19px sans-serif';
      oledCtx.fillText(st.genre, 16, 162);

      // 6. Dynamic 16-Bar Equalizer with Floating Peak Dots
      oledCtx.fillStyle = '#38bdf8';
      const baseBars = [8, 16, 28, 20, 36, 24, 18, 34, 28, 14, 24, 40, 20, 30, 18, 32];
      const numBars = 16;
      const barW = 24;
      const gap = 7;
      const startX = 14;

      for (let i = 0; i < numBars; i++) {
        let h;
        if (isPlaying) {
          const wave = Math.sin((tick * 0.4) + (i * 0.6)) * 14;
          h = Math.max(6, Math.min(62, baseBars[(i + tick) % numBars] + wave));
        } else {
          h = 8 + Math.sin((tick * 0.1) + (i * 0.4)) * 5;
        }

        // Draw bouncing bar
        oledCtx.fillStyle = '#38bdf8';
        oledCtx.fillRect(startX + i * (barW + gap), 244 - h, barW, h);

        // Floating white peak cap
        oledCtx.fillStyle = '#ffffff';
        oledCtx.fillRect(startX + i * (barW + gap), 244 - h - 5, barW, 3);
      }

      oledTexture.needsUpdate = true;
    }

    // Expose hook globally so on-page buttons immediately refresh 3D screen
    window.update3dRadioOled = updateOledCanvas;
    // Paint frame 0 immediately upon startup
    updateOledCanvas(0);

    // Radio Group
    const radioGroup = new THREE.Group();
    scene.add(radioGroup);

    // 1. Solid Oak Wooden Cabinet
    const woodTex = createWoodTexture();
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.55,
      metalness: 0.05
    });

    // Main cabinet body: 3.6 wide, 2.2 high, 1.8 deep (front at z = 0.90)
    const cabinetGeo = new THREE.BoxGeometry(3.6, 2.2, 1.8);
    const cabinetMesh = new THREE.Mesh(cabinetGeo, woodMat);
    cabinetMesh.castShadow = true;
    cabinetMesh.receiveShadow = true;
    radioGroup.add(cabinetMesh);

    // Front Fascia Board: 3.52 wide, 2.12 high, 0.04 thick at z = 0.91 (front face at z = 0.93)
    const fasciaMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.65
    });
    const fasciaGeo = new THREE.BoxGeometry(3.52, 2.12, 0.04);
    const fasciaMesh = new THREE.Mesh(fasciaGeo, fasciaMat);
    fasciaMesh.position.z = 0.91;
    radioGroup.add(fasciaMesh);

    // 2. Circular Speaker Grille
    const fabricTex = createFabricTexture();
    const speakerClothMat = new THREE.MeshStandardMaterial({
      map: fabricTex,
      roughness: 0.8
    });
    const speakerGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.04, 32);
    speakerGeo.rotateX(Math.PI / 2);
    const speakerMesh = new THREE.Mesh(speakerGeo, speakerClothMat);
    speakerMesh.position.set(-0.85, 0.05, 0.94);
    radioGroup.add(speakerMesh);

    // Speaker Outer Ring Frame
    const ringGeo = new THREE.TorusGeometry(0.72, 0.06, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.5 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(-0.85, 0.05, 0.96);
    radioGroup.add(ringMesh);

    // 3. 0.96" MONOCHROME OLED DISPLAY MODULE ASSEMBLY (Centered at x=0.75, y=0.42)
    // a. Breakout Board PCB (Navy Blue FR4 with solder pads)
    const oledPcbMat = new THREE.MeshStandardMaterial({ color: 0x0c1e36, roughness: 0.4 });
    const oledPcbGeo = new THREE.BoxGeometry(1.48, 0.88, 0.03);
    const oledPcbMesh = new THREE.Mesh(oledPcbGeo, oledPcbMat);
    oledPcbMesh.position.set(0.75, 0.42, 0.945); // front at z = 0.96
    radioGroup.add(oledPcbMesh);

    // b. Corner Mounting Screws on PCB
    const screwMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.8, roughness: 0.3 });
    const screwGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12);
    screwGeo.rotateX(Math.PI / 2);
    [[-0.66, -0.38], [0.66, -0.38], [-0.66, 0.38], [0.66, 0.38]].forEach(([ox, oy]) => {
      const screw = new THREE.Mesh(screwGeo, screwMat);
      screw.position.set(0.75 + ox, 0.42 + oy, 0.965);
      radioGroup.add(screw);
    });

    // c. Piano-Black OLED Glass Bezel Frame (recessed border)
    const oledBezelMat = new THREE.MeshStandardMaterial({ color: 0x070b12, roughness: 0.2 });
    const oledBezelGeo = new THREE.BoxGeometry(1.34, 0.72, 0.03);
    const oledBezel = new THREE.Mesh(oledBezelGeo, oledBezelMat);
    oledBezel.position.set(0.75, 0.42, 0.975); // front at z = 0.99
    radioGroup.add(oledBezel);

    // d. Active Self-Luminous Monochrome OLED Screen (Completely in front, zero occlusion!)
    const oledMat = new THREE.MeshBasicMaterial({
      map: oledTexture,
      side: THREE.FrontSide
    });
    const oledGeo = new THREE.PlaneGeometry(1.24, 0.62);
    const oledMesh = new THREE.Mesh(oledGeo, oledMat);
    oledMesh.position.set(0.75, 0.42, 1.002); // proudly in front at z = 1.002
    radioGroup.add(oledMesh);

    // e. Protective Acrylic Glass Sheen Cover
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
      roughness: 0.08,
      reflectivity: 0.9
    });
    const glassGeo = new THREE.PlaneGeometry(1.26, 0.64);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(0.75, 0.42, 1.006);
    radioGroup.add(glassMesh);

    // Brass Material for Hardware
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xdfab34,
      metalness: 0.88,
      roughness: 0.28
    });

    // 4. Brass Knurled Volume Potentiometer (Safe Capped)
    const potGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.24, 24);
    potGeo.rotateX(Math.PI / 2);
    const potMesh = new THREE.Mesh(potGeo, brassMat);
    potMesh.position.set(0.55, -0.42, 1.06);
    radioGroup.add(potMesh);

    // 5. Tactile Push Button (Station Switcher)
    const btnBaseGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 20);
    btnBaseGeo.rotateX(Math.PI / 2);
    const btnBaseMesh = new THREE.Mesh(btnBaseGeo, brassMat);
    btnBaseMesh.position.set(1.15, -0.42, 0.96);
    radioGroup.add(btnBaseMesh);

    const btnPlungerGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 20);
    btnPlungerGeo.rotateX(Math.PI / 2);
    const btnMesh = new THREE.Mesh(btnPlungerGeo, brassMat);
    btnMesh.position.set(1.15, -0.42, 1.04);
    radioGroup.add(btnMesh);

    // 6. Metal Toggle Power Switch
    const switchBaseGeo = new THREE.BoxGeometry(0.2, 0.28, 0.05);
    const switchBaseMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const switchBase = new THREE.Mesh(switchBaseGeo, switchBaseMat);
    switchBase.position.set(0.12, -0.42, 0.96);
    radioGroup.add(switchBase);

    const leverGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.28, 12);
    leverGeo.rotateZ(0.25);
    leverGeo.rotateX(Math.PI / 2);
    const leverMesh = new THREE.Mesh(leverGeo, switchBaseMat);
    leverMesh.position.set(0.12, -0.38, 1.08);
    radioGroup.add(leverMesh);

    // 7. USB-C Port Slot on the Left Side
    const usbSlotGeo = new THREE.BoxGeometry(0.04, 0.12, 0.32);
    const usbSlotMat = new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.8 });
    const usbSlot = new THREE.Mesh(usbSlotGeo, usbSlotMat);
    usbSlot.position.set(-1.81, -0.4, 0);
    radioGroup.add(usbSlot);

    // 8. 3D Floating Soundwave Rings from Speaker
    const soundwaveRings = [];
    for (let r = 0; r < 3; r++) {
      const swGeo = new THREE.RingGeometry(0.75 + r * 0.28, 0.78 + r * 0.28, 32);
      const swMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35 - r * 0.1,
        side: THREE.DoubleSide
      });
      const swMesh = new THREE.Mesh(swGeo, swMat);
      swMesh.position.set(-0.85, 0.05, 0.96 + r * 0.08);
      radioGroup.add(swMesh);
      soundwaveRings.push(swMesh);
    }

    // 9. Floating Background Particle Field
    const particleCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount * 3; p += 3) {
      particlePos[p] = (Math.random() - 0.5) * 8;
      particlePos[p + 1] = (Math.random() - 0.5) * 6;
      particlePos[p + 2] = (Math.random() - 0.5) * 6;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.05,
      transparent: true,
      opacity: 0.6
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Interactive Button Hooks
    const btn3dRotate = document.getElementById('btn-3d-rotate');
    const rotateStatusText = document.getElementById('rotate-status-text');
    const btn3dReset = document.getElementById('btn-3d-reset');
    const calloutPills = document.querySelectorAll('.callout-pill');

    let autoRotateActive = true;
    if (btn3dRotate && controls) {
      btn3dRotate.addEventListener('click', () => {
        autoRotateActive = !autoRotateActive;
        controls.autoRotate = autoRotateActive;
        if (rotateStatusText) rotateStatusText.textContent = autoRotateActive ? 'ON' : 'OFF';
        playChirp();
      });
    }

    if (btn3dReset && controls) {
      btn3dReset.addEventListener('click', () => {
        controls.reset();
        camera.position.set(0, 1.2, 5.2);
        controls.target.set(0, 0, 0);
        playChirp();
      });
    }

    // Callout Focus Transitions
    calloutPills.forEach(pill => {
      pill.addEventListener('click', () => {
        calloutPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const part = pill.dataset.part;
        playChirp();

        if (controls) controls.autoRotate = false;
        if (rotateStatusText) rotateStatusText.textContent = 'OFF';

        if (part === 'oled') {
          camera.position.set(0.75, 0.42, 2.1);
          if (controls) controls.target.set(0.75, 0.42, 1.0);
        } else if (part === 'speaker') {
          camera.position.set(-0.85, 0.05, 2.3);
          if (controls) controls.target.set(-0.85, 0.05, 0.95);
        } else if (part === 'pot') {
          camera.position.set(0.55, -0.42, 2.2);
          if (controls) controls.target.set(0.55, -0.42, 1.05);
        } else if (part === 'button') {
          camera.position.set(1.15, -0.42, 2.2);
          if (controls) controls.target.set(1.15, -0.42, 1.04);
        } else if (part === 'switch') {
          camera.position.set(0.12, -0.42, 2.2);
          if (controls) controls.target.set(0.12, -0.42, 1.02);
        }
      });
    });

    // 3D Canvas Click / Raycaster to cycle station when clicking the 3D button
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    renderer.domElement.addEventListener('pointerdown', (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects([btnMesh, btnBaseMesh, oledMesh]);
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        if (clickedMesh === btnMesh || clickedMesh === btnBaseMesh) {
          playChirp();
          const nextIdx = (currentActiveIndex + 1) % stationStreamList.length;
          playStationByIndex(nextIdx);
        } else if (clickedMesh === oledMesh) {
          playChirp();
          camera.position.set(0.75, 0.42, 2.1);
          if (controls) {
            controls.autoRotate = false;
            if (rotateStatusText) rotateStatusText.textContent = 'OFF';
            controls.target.set(0.75, 0.42, 1.0);
          }
        }
      }
    });

    // Animation Loop
    let animClock = 0;
    function animate() {
      requestAnimationFrame(animate);
      animClock++;

      // Pulse dynamic soundwaves if audio is playing
      soundwaveRings.forEach((ring, idx) => {
        const isLive = isStreamPlaying;
        const scaleVal = isLive ? (1 + Math.sin(animClock * 0.15 + idx) * 0.12) : 1;
        ring.scale.set(scaleVal, scaleVal, 1);
        ring.material.opacity = isLive ? (0.45 - idx * 0.12 + Math.sin(animClock * 0.2) * 0.1) : 0.08;
      });

      // Update 3D OLED screen equalizer animation
      if (animClock % 6 === 0) {
        updateOledCanvas(Math.floor(animClock / 6));
      }

      // Rotate particle field gently
      particleSystem.rotation.y += 0.0008;

      if (controls) controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Window Resize Handler
    function onWindowResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onWindowResize);
  }

  // Initialize Three.js when ready
  if (window.THREE) {
    initThreeJsRadio();
  } else {
    window.addEventListener('load', () => {
      if (window.THREE) initThreeJsRadio();
    });
  }

});

