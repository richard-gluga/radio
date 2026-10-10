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
  const btnCopy = document.getElementById('btn-copy-code');

  function updateCodePreview() {
    const ssid = inputSsid.value.trim() || 'MyHomeWiFi';
    const pass = inputPass.value || 'SecretPassword123';
    const vol = inputVol.value || '14';

    if (codeSsid) codeSsid.textContent = ssid;
    if (codePass) codePass.textContent = pass;
    if (codeVol) codeVol.textContent = vol;
    if (volDisplay) volDisplay.textContent = `${vol} / 21`;
  }

  if (inputSsid) inputSsid.addEventListener('input', updateCodePreview);
  if (inputPass) inputPass.addEventListener('input', updateCodePreview);
  if (inputVol) inputVol.addEventListener('input', updateCodePreview);

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

});
