'use strict';

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);
const KEYBOARD_RANGES = {
  25: [48, 72],
  49: [36, 84],
  61: [36, 96],
  76: [28, 103],
  88: [21, 108]
};

const state = {
  piece: null,
  tempo: 92,
  mode: 'continuous',
  playing: false,
  micReady: false,
  showHints: true,
  keyboardSize: 61,
  audioContext: null,
  analyser: null,
  source: null,
  stream: null,
  audioBuffer: null,
  animationFrame: null,
  lastFrameAt: 0,
  currentSeconds: 0,
  currentIndex: 0,
  stableMidi: null,
  stableCount: 0,
  lastAcceptedAt: 0,
  noteResults: [],
  wrongAttempts: 0,
  detectedMidi: null,
  detectedFrequency: null,
  detectedConfidence: 0,
  scoreCanvasScale: window.devicePixelRatio || 1,
  lastDrawAt: 0,
  lastAnalysisAt: 0
};

const els = {};

window.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  bindEvents();
  await loadDemoPiece();
  restoreSettings();
  renderKeyboard();
  resizeCanvas();
  updateAllUI();

  window.addEventListener('resize', () => {
    resizeCanvas();
    renderKeyboard();
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
}

function cacheElements() {
  const ids = [
    'pieceTitle', 'pieceMeta', 'micButton', 'playButton', 'resetButton', 'modeSelect',
    'tempoInput', 'tempoValue', 'keyboardSizeSelect', 'hintsToggle', 'pieceFileInput',
    'transportStatus', 'scoreCanvas', 'expectedNote', 'detectedNote', 'frequencyValue',
    'confidenceValue', 'correctValue', 'errorValue', 'keyboardViewport', 'keyboard',
    'microphoneHint', 'progressBar', 'sessionSummary', 'toastTemplate'
  ];
  ids.forEach((id) => { els[id] = document.getElementById(id); });
}

function bindEvents() {
  els.micButton.addEventListener('click', enableMicrophone);
  els.playButton.addEventListener('click', togglePlayback);
  els.resetButton.addEventListener('click', resetSession);
  els.modeSelect.addEventListener('change', () => {
    state.mode = els.modeSelect.value;
    resetSession();
    saveSettings();
  });
  els.tempoInput.addEventListener('input', () => {
    state.tempo = Number(els.tempoInput.value);
    els.tempoValue.textContent = String(state.tempo);
    saveSettings();
  });
  els.keyboardSizeSelect.addEventListener('change', () => {
    state.keyboardSize = Number(els.keyboardSizeSelect.value);
    renderKeyboard();
    saveSettings();
  });
  els.hintsToggle.addEventListener('change', () => {
    state.showHints = els.hintsToggle.checked;
    updateKeyboardHighlights();
    saveSettings();
  });
  els.pieceFileInput.addEventListener('change', importPieceFile);
}

async function loadDemoPiece() {
  try {
    const response = await fetch('./pieces/demo.json');
    if (!response.ok) throw new Error('No se pudo cargar la demo');
    const data = await response.json();
    setPiece(validatePiece(data));
  } catch (error) {
    setPiece(validatePiece({
      title: 'Escala de Do',
      composer: 'Demo local',
      tempo: 80,
      timeSignature: '4/4',
      notes: [60, 62, 64, 65, 67, 69, 71, 72].map((midi, index) => ({
        midi,
        startBeat: index,
        durationBeats: 1
      }))
    }));
  }
}

function validatePiece(input) {
  if (!input || typeof input !== 'object') throw new Error('El archivo no contiene un objeto JSON válido.');
  if (!Array.isArray(input.notes) || input.notes.length === 0) throw new Error('La pieza debe contener al menos una nota.');

  const notes = input.notes.map((note, index) => {
    const midi = Number(note.midi);
    const startBeat = Number(note.startBeat);
    const durationBeats = Number(note.durationBeats ?? 1);
    if (!Number.isFinite(midi) || midi < 21 || midi > 108) throw new Error(`Nota ${index + 1}: midi debe estar entre 21 y 108.`);
    if (!Number.isFinite(startBeat) || startBeat < 0) throw new Error(`Nota ${index + 1}: startBeat no es válido.`);
    if (!Number.isFinite(durationBeats) || durationBeats <= 0) throw new Error(`Nota ${index + 1}: durationBeats no es válido.`);
    return { midi: Math.round(midi), startBeat, durationBeats, hand: note.hand || null };
  }).sort((a, b) => a.startBeat - b.startBeat);

  return {
    title: String(input.title || 'Pieza sin título'),
    composer: String(input.composer || 'Autor desconocido'),
    tempo: clamp(Number(input.tempo) || 80, 40, 180),
    timeSignature: String(input.timeSignature || '4/4'),
    description: String(input.description || 'Pieza importada'),
    notes
  };
}

function setPiece(piece) {
  state.piece = piece;
  state.tempo = piece.tempo;
  els.tempoInput.value = String(state.tempo);
  resetSession();
}

async function importPieceFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const piece = validatePiece(JSON.parse(text));
    setPiece(piece);
    updateAllUI();
    showToast(`Pieza cargada: ${piece.title}`);
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'No se pudo leer la pieza.');
  } finally {
    event.target.value = '';
  }
}

async function enableMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Este navegador no permite acceder al micrófono. Usa HTTPS o localhost.');
    return;
  }

  try {
    if (state.audioContext?.state === 'suspended') await state.audioContext.resume();
    if (state.micReady) return;

    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1
      }
    });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextClass();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 4096;
    state.analyser.smoothingTimeConstant = 0;
    state.audioBuffer = new Float32Array(state.analyser.fftSize);
    state.source = state.audioContext.createMediaStreamSource(state.stream);
    state.source.connect(state.analyser);
    state.micReady = true;
    els.micButton.textContent = 'Micrófono activo';
    els.micButton.disabled = true;
    els.microphoneHint.textContent = 'Escuchando. Toca una nota clara y sostenida.';
    showToast('Micrófono activado. Evita ruido de fondo y usa auriculares para el metrónomo.');
    startLoop();
  } catch (error) {
    showToast('No se pudo activar el micrófono. Revisa el permiso del navegador.');
  }
}

function togglePlayback() {
  if (!state.piece) return;
  state.playing = !state.playing;
  state.lastFrameAt = performance.now();
  if (state.playing && !state.micReady) showToast('La pieza puede avanzar, pero necesitas activar el micrófono para validar notas.');
  startLoop();
  updateTransportUI();
}

function resetSession() {
  state.playing = false;
  state.currentSeconds = 0;
  state.currentIndex = 0;
  state.lastFrameAt = performance.now();
  state.lastAcceptedAt = 0;
  state.noteResults = state.piece ? state.piece.notes.map(() => 'pending') : [];
  state.wrongAttempts = 0;
  state.detectedMidi = null;
  state.detectedFrequency = null;
  state.detectedConfidence = 0;
  updateAllUI();
  drawScore();
}

function startLoop() {
  if (state.animationFrame) return;
  const loop = (timestamp) => {
    state.animationFrame = requestAnimationFrame(loop);
    const delta = Math.min((timestamp - (state.lastFrameAt || timestamp)) / 1000, 0.08);
    state.lastFrameAt = timestamp;

    if (state.playing) advanceTransport(delta);
    if (state.micReady && timestamp - state.lastAnalysisAt > 70) {
      state.lastAnalysisAt = timestamp;
      analyzeMicrophone(timestamp);
    }
    if (timestamp - state.lastDrawAt > 16) {
      state.lastDrawAt = timestamp;
      drawScore();
      updateProgressUI();
    }
  };
  state.animationFrame = requestAnimationFrame(loop);
}

function advanceTransport(delta) {
  if (!state.piece) return;

  if (state.mode === 'continuous') {
    state.currentSeconds += delta;
    evaluateMissedNotes();
    state.currentIndex = getContinuousExpectedIndex();
    if (state.currentSeconds >= getPieceDurationSeconds()) finishSession();
  } else {
    const note = state.piece.notes[state.currentIndex];
    if (!note) finishSession();
    else state.currentSeconds = beatToSeconds(note.startBeat);
  }
  updateDynamicUI();
}

function analyzeMicrophone(timestamp) {
  state.analyser.getFloatTimeDomainData(state.audioBuffer);
  const rms = calculateRms(state.audioBuffer);

  if (rms < 0.012) {
    state.detectedMidi = null;
    state.detectedFrequency = null;
    state.detectedConfidence = 0;
    state.stableMidi = null;
    state.stableCount = 0;
    updateDynamicUI();
    return;
  }

  const result = yinPitch(state.audioBuffer, state.audioContext.sampleRate, 0.13);
  if (!result || result.frequency < 27 || result.frequency > 4300) return;

  const midiFloat = frequencyToMidi(result.frequency);
  const midi = Math.round(midiFloat);
  if (midi < 21 || midi > 108) return;

  state.detectedMidi = midi;
  state.detectedFrequency = result.frequency;
  state.detectedConfidence = result.confidence;

  if (state.stableMidi === midi) state.stableCount += 1;
  else {
    state.stableMidi = midi;
    state.stableCount = 1;
  }

  if (state.stableCount >= 3 && result.confidence >= 0.72 && timestamp - state.lastAcceptedAt > 180) {
    acceptDetectedNote(midi, timestamp);
  }
  updateDynamicUI();
}

function acceptDetectedNote(midi, timestamp) {
  if (!state.playing || !state.piece) return;
  const expectedIndex = state.mode === 'wait' ? state.currentIndex : getContinuousExpectedIndex();
  const expected = state.piece.notes[expectedIndex];
  if (!expected) return;

  if (midi === expected.midi) {
    if (state.noteResults[expectedIndex] !== 'correct') state.noteResults[expectedIndex] = 'correct';
    state.lastAcceptedAt = timestamp;
    flashKey(midi, 'detected');

    if (state.mode === 'wait') {
      state.currentIndex += 1;
      const next = state.piece.notes[state.currentIndex];
      if (next) state.currentSeconds = beatToSeconds(next.startBeat);
      else finishSession();
    }
  } else {
    state.wrongAttempts += 1;
    flashKey(midi, 'wrong');
    if (state.mode === 'continuous' && state.noteResults[expectedIndex] === 'pending') {
      state.noteResults[expectedIndex] = 'wrong';
    }
  }
  updateDynamicUI();
}

function evaluateMissedNotes() {
  const graceSeconds = 0.4;
  state.piece.notes.forEach((note, index) => {
    const noteEnd = beatToSeconds(note.startBeat + note.durationBeats);
    if (state.currentSeconds > noteEnd + graceSeconds && state.noteResults[index] === 'pending') {
      state.noteResults[index] = 'missed';
    }
  });
}

function getContinuousExpectedIndex() {
  if (!state.piece) return 0;
  const targetBeat = secondsToBeat(state.currentSeconds);
  let bestIndex = state.piece.notes.length - 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  state.piece.notes.forEach((note, index) => {
    if (state.noteResults[index] === 'correct' || state.noteResults[index] === 'missed') return;
    const distance = Math.abs(note.startBeat - targetBeat);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function finishSession() {
  state.playing = false;
  if (state.mode === 'continuous') evaluateMissedNotes();
  updateAllUI();
  showToast('Sesión terminada. Revisa el resumen de resultados.');
}

function updateAllUI() {
  if (!state.piece) return;
  els.pieceTitle.textContent = state.piece.title;
  els.pieceMeta.textContent = `${state.piece.composer} · ${state.piece.description}`;
  els.tempoInput.value = String(state.tempo);
  els.tempoValue.textContent = String(state.tempo);
  els.modeSelect.value = state.mode;
  els.keyboardSizeSelect.value = String(state.keyboardSize);
  els.hintsToggle.checked = state.showHints;
  updateTransportUI();
  updateDynamicUI();
  updateProgressUI();
}

function updateTransportUI() {
  els.playButton.textContent = state.playing ? '⏸ Pausar' : '▶ Empezar';
  if (!state.playing && state.currentSeconds === 0) els.transportStatus.textContent = 'Preparado';
  else if (!state.playing) els.transportStatus.textContent = 'Pausado';
  else if (state.mode === 'wait') els.transportStatus.textContent = 'Esperando nota';
  else els.transportStatus.textContent = 'En reproducción';
}

function updateDynamicUI() {
  if (!state.piece) return;
  const expected = state.piece.notes[state.currentIndex] || state.piece.notes[getContinuousExpectedIndex()];
  els.expectedNote.textContent = expected ? midiToNoteName(expected.midi) : 'Fin';
  els.detectedNote.textContent = state.detectedMidi === null ? '—' : midiToNoteName(state.detectedMidi);
  els.frequencyValue.textContent = state.detectedFrequency ? `${state.detectedFrequency.toFixed(1)} Hz` : '—';
  els.confidenceValue.textContent = state.detectedConfidence ? `${Math.round(state.detectedConfidence * 100)} %` : '—';

  const correct = state.noteResults.filter((value) => value === 'correct').length;
  const errors = state.noteResults.filter((value) => value === 'wrong' || value === 'missed').length + state.wrongAttempts;
  els.correctValue.textContent = String(correct);
  els.errorValue.textContent = String(errors);

  updateKeyboardHighlights();
  updateSessionSummary(correct, errors);
  updateTransportUI();
}

function updateProgressUI() {
  if (!state.piece) return;
  const total = state.piece.notes.length;
  const progress = state.mode === 'wait'
    ? state.currentIndex / total
    : Math.min(state.currentSeconds / getPieceDurationSeconds(), 1);
  els.progressBar.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
}

function updateSessionSummary(correctCount, errorCount) {
  const completed = state.noteResults.filter((value) => value !== 'pending').length;
  const accuracy = completed > 0 ? Math.round((correctCount / completed) * 100) : 0;
  if (completed === 0 && errorCount === 0) {
    els.sessionSummary.textContent = 'Todavía no hay resultados.';
    return;
  }
  els.sessionSummary.textContent = `${correctCount} notas correctas, ${errorCount} errores o intentos incorrectos. Precisión provisional: ${accuracy} %.`;
}

function renderKeyboard() {
  const range = KEYBOARD_RANGES[state.keyboardSize] || KEYBOARD_RANGES[61];
  const [startMidi, endMidi] = range;
  const whiteMidis = [];
  for (let midi = startMidi; midi <= endMidi; midi += 1) {
    if (!BLACK_PITCH_CLASSES.has(midi % 12)) whiteMidis.push(midi);
  }

  const viewportWidth = Math.max(els.keyboardViewport.clientWidth || 720, 360);
  const whiteWidth = Math.max(20, viewportWidth / Math.min(whiteMidis.length, 22));
  const totalWidth = whiteWidth * whiteMidis.length;
  const blackWidth = whiteWidth * 0.62;
  els.keyboard.innerHTML = '';
  els.keyboard.style.width = `${totalWidth}px`;
  els.keyboard.style.minWidth = `${totalWidth}px`;

  let whiteIndex = 0;
  for (let midi = startMidi; midi <= endMidi; midi += 1) {
    const isBlack = BLACK_PITCH_CLASSES.has(midi % 12);
    const key = document.createElement('div');
    key.className = `piano-key ${isBlack ? 'black' : 'white'}`;
    key.dataset.midi = String(midi);
    key.title = midiToNoteName(midi);

    if (isBlack) {
      key.style.width = `${blackWidth}px`;
      key.style.left = `${whiteIndex * whiteWidth - blackWidth / 2}px`;
    } else {
      key.style.width = `${whiteWidth}px`;
      key.style.left = `${whiteIndex * whiteWidth}px`;
      if (midi % 12 === 0) {
        const label = document.createElement('span');
        label.className = 'key-label';
        label.textContent = midiToNoteName(midi);
        key.appendChild(label);
      }
      whiteIndex += 1;
    }
    els.keyboard.appendChild(key);
  }
  updateKeyboardHighlights();
}

function updateKeyboardHighlights() {
  document.querySelectorAll('.piano-key.expected').forEach((key) => key.classList.remove('expected'));
  if (!state.showHints || !state.piece) return;
  const expected = state.mode === 'wait'
    ? state.piece.notes[state.currentIndex]
    : state.piece.notes[getContinuousExpectedIndex()];
  if (!expected) return;
  const key = els.keyboard.querySelector(`[data-midi="${expected.midi}"]`);
  if (key) {
    key.classList.add('expected');
    ensureKeyVisible(key);
  }
}

function ensureKeyVisible(key) {
  const keyLeft = key.offsetLeft;
  const keyRight = keyLeft + key.offsetWidth;
  const viewLeft = els.keyboardViewport.scrollLeft;
  const viewRight = viewLeft + els.keyboardViewport.clientWidth;
  if (keyLeft < viewLeft || keyRight > viewRight) {
    els.keyboardViewport.scrollTo({
      left: Math.max(0, keyLeft - els.keyboardViewport.clientWidth / 2),
      behavior: 'smooth'
    });
  }
}

function flashKey(midi, className) {
  const key = els.keyboard.querySelector(`[data-midi="${midi}"]`);
  if (!key) return;
  key.classList.add(className, 'active');
  window.setTimeout(() => key.classList.remove(className, 'active'), 240);
}

function resizeCanvas() {
  const rect = els.scoreCanvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  state.scoreCanvasScale = scale;
  els.scoreCanvas.width = Math.max(1, Math.floor(rect.width * scale));
  els.scoreCanvas.height = Math.max(1, Math.floor(rect.height * scale));
  drawScore();
}

function drawScore() {
  if (!state.piece) return;
  const canvas = els.scoreCanvas;
  const context = canvas.getContext('2d');
  const scale = state.scoreCanvasScale;
  const width = canvas.width / scale;
  const height = canvas.height / scale;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#f7f4ec';
  context.fillRect(0, 0, width, height);

  const staffTop = height * 0.29;
  const lineGap = Math.min(21, height * 0.085);
  const playheadX = Math.min(width * 0.25, 210);
  const pixelsPerBeat = Math.max(58, width / 8.8);
  const currentBeat = secondsToBeat(state.currentSeconds);

  context.strokeStyle = '#3d4651';
  context.lineWidth = 1;
  for (let line = 0; line < 5; line += 1) {
    const y = staffTop + line * lineGap;
    context.beginPath();
    context.moveTo(18, y);
    context.lineTo(width - 18, y);
    context.stroke();
  }

  context.strokeStyle = '#6685ff';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(playheadX, staffTop - 44);
  context.lineTo(playheadX, staffTop + lineGap * 4 + 44);
  context.stroke();

  const beatsPerMeasure = Number(state.piece.timeSignature.split('/')[0]) || 4;
  const firstBeat = Math.floor(currentBeat - playheadX / pixelsPerBeat) - 1;
  const lastBeat = Math.ceil(currentBeat + (width - playheadX) / pixelsPerBeat) + 1;
  context.font = '12px system-ui';
  context.fillStyle = '#68727e';
  context.textAlign = 'center';
  for (let beat = firstBeat; beat <= lastBeat; beat += 1) {
    if (beat < 0 || beat % beatsPerMeasure !== 0) continue;
    const x = playheadX + (beat - currentBeat) * pixelsPerBeat;
    context.strokeStyle = 'rgba(61, 70, 81, 0.28)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, staffTop - 8);
    context.lineTo(x, staffTop + lineGap * 4 + 8);
    context.stroke();
    context.fillText(String(beat / beatsPerMeasure + 1), x, staffTop - 18);
  }

  state.piece.notes.forEach((note, index) => {
    const x = playheadX + (note.startBeat - currentBeat) * pixelsPerBeat;
    if (x < -35 || x > width + 35) return;
    const y = midiToStaffY(note.midi, staffTop, lineGap);
    const status = state.noteResults[index];
    const isCurrent = index === (state.mode === 'wait' ? state.currentIndex : getContinuousExpectedIndex());

    context.save();
    if (status === 'correct') context.fillStyle = '#20a877';
    else if (status === 'wrong' || status === 'missed') context.fillStyle = '#e7485b';
    else if (isCurrent) context.fillStyle = '#526ff3';
    else context.fillStyle = '#232a33';

    context.translate(x, y);
    context.rotate(-0.28);
    context.beginPath();
    context.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.strokeStyle = context.fillStyle;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x + 8, y - 1);
    context.lineTo(x + 8, y - 34);
    context.stroke();

    const durationWidth = Math.max(10, note.durationBeats * pixelsPerBeat * 0.55);
    context.strokeStyle = 'rgba(35, 42, 51, 0.25)';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x + 13, y + 16);
    context.lineTo(x + durationWidth, y + 16);
    context.stroke();
  });

  context.fillStyle = '#27303a';
  context.font = '700 14px system-ui';
  context.textAlign = 'left';
  context.fillText('Clave de sol · representación simplificada', 18, 24);
}

function midiToStaffY(midi, staffTop, lineGap) {
  const referenceMidi = 71; // B4, línea central aproximada.
  const semitoneOffset = midi - referenceMidi;
  return staffTop + lineGap * 2 - semitoneOffset * (lineGap / 4);
}

function yinPitch(buffer, sampleRate, threshold) {
  // Limitamos el rango a aproximadamente A0-C8 para evitar trabajo innecesario.
  const minFrequency = 27;
  const maxFrequency = 4200;
  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maxTau = Math.min(Math.floor(sampleRate / minFrequency), buffer.length - 2);
  const comparisonLength = Math.min(2048, buffer.length - maxTau);
  if (comparisonLength < 256) return null;

  const difference = new Float32Array(maxTau + 1);
  const cumulative = new Float32Array(maxTau + 1);

  for (let tau = 1; tau <= maxTau; tau += 1) {
    let sum = 0;
    for (let index = 0; index < comparisonLength; index += 1) {
      const delta = buffer[index] - buffer[index + tau];
      sum += delta * delta;
    }
    difference[tau] = sum;
  }

  cumulative[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau += 1) {
    runningSum += difference[tau];
    cumulative[tau] = runningSum === 0 ? 1 : difference[tau] * tau / runningSum;
  }

  let tauEstimate = -1;
  for (let tau = minTau; tau <= maxTau; tau += 1) {
    if (cumulative[tau] < threshold) {
      while (tau + 1 <= maxTau && cumulative[tau + 1] < cumulative[tau]) tau += 1;
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return null;
  const betterTau = parabolicInterpolation(cumulative, tauEstimate);
  const frequency = sampleRate / betterTau;
  const confidence = clamp(1 - cumulative[tauEstimate], 0, 1);
  return { frequency, confidence };
}

function parabolicInterpolation(values, index) {
  const left = values[index - 1] ?? values[index];
  const center = values[index];
  const right = values[index + 1] ?? values[index];
  const denominator = 2 * (2 * center - right - left);
  if (denominator === 0) return index;
  return index + (right - left) / denominator;
}

function calculateRms(buffer) {
  let sum = 0;
  for (let index = 0; index < buffer.length; index += 1) sum += buffer[index] * buffer[index];
  return Math.sqrt(sum / buffer.length);
}

function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

function midiToNoteName(midi) {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pitchClass]}${octave}`;
}

function beatToSeconds(beat) {
  return beat * 60 / state.tempo;
}

function secondsToBeat(seconds) {
  return seconds * state.tempo / 60;
}

function getPieceDurationSeconds() {
  const last = state.piece.notes[state.piece.notes.length - 1];
  return beatToSeconds(last.startBeat + last.durationBeats);
}

function saveSettings() {
  localStorage.setItem('pianoCoachSettings', JSON.stringify({
    mode: state.mode,
    keyboardSize: state.keyboardSize,
    showHints: state.showHints
  }));
}

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('pianoCoachSettings') || '{}');
    if (saved.mode === 'continuous' || saved.mode === 'wait') state.mode = saved.mode;
    if (KEYBOARD_RANGES[saved.keyboardSize]) state.keyboardSize = Number(saved.keyboardSize);
    if (typeof saved.showHints === 'boolean') state.showHints = saved.showHints;
  } catch (_) {
    // Preferimos valores por defecto si el almacenamiento está dañado.
  }
}

function showToast(message) {
  document.querySelectorAll('.toast').forEach((toast) => toast.remove());
  const fragment = els.toastTemplate.content.cloneNode(true);
  const toast = fragment.querySelector('.toast');
  toast.textContent = message;
  document.body.appendChild(fragment);
  window.setTimeout(() => toast.remove(), 3600);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
