'use strict';

const NOTE_NAMES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);
const SOLFEGE_MARKERS = {
  0: { text: 'do', className: 'note-do' },
  2: { text: 're', className: 'note-re' },
  4: { text: 'mi', className: 'note-mi' },
  5: { text: 'fa', className: 'note-fa' },
  7: { text: 'sol', className: 'note-sol' },
  9: { text: 'la', className: 'note-la' },
  11: { text: 'si', className: 'note-si' }
};
const KEYBOARD_RANGES = {
  25: [48, 72],
  37: [36, 72],
  49: [36, 84],
  61: [36, 96],
  76: [28, 103],
  88: [21, 108]
};
const BUILT_IN_PIECES = {
  demo: './pieces/demo.json',
  twinkle: './pieces/twinkle.json'
};
const CALIBRATION_STEPS = [
  { midi: 60, label: 'Do4', instruction: 'Toca y mantén el Do central marcado en el teclado de la app.' },
  { midi: 64, label: 'Mi4', instruction: 'Toca el Mi marcado, en la misma octava que el Do anterior.' },
  { midi: 67, label: 'Sol4', instruction: 'Toca el Sol marcado, en la misma octava.' }
];

const state = {
  piece: null,
  selectedPieceId: 'demo',
  tempo: 92,
  mode: 'continuous',
  sessionKind: null,
  playing: false,
  micReady: false,
  showHints: true,
  keyboardSize: 37,
  pitchOffset: 0,
  rawDetectedMidi: null,
  calibration: {
    active: false,
    step: 0,
    readings: [],
    awaitingRelease: false,
    completed: false
  },
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
  lastAnalysisAt: 0,
  previewPlayedIndexes: new Set(),
  activeSynthNodes: new Set()
};

const els = {};

window.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  bindEvents();
  restoreSettings();
  await loadBuiltInPiece(state.selectedPieceId, false);
  renderKeyboard();
  resizeCanvas();
  updateAllUI();
  updateOrientationState();

  window.addEventListener('resize', () => {
    resizeCanvas();
    renderKeyboard();
    updateOrientationState();
  });
  window.addEventListener('orientationchange', () => window.setTimeout(updateOrientationState, 150));

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
}

function cacheElements() {
  const ids = [
    'pieceTitle', 'pieceMeta', 'pieceSelect', 'micButton', 'playButton', 'previewButton',
    'resetButton', 'calibrateButton', 'modeSelect', 'tempoInput', 'tempoValue', 'keyboardSizeSelect',
    'hintsToggle', 'pieceFileInput', 'micHelp', 'micHelpTitle', 'micHelpText',
    'retryMicButton', 'calibrationPanel', 'calibrationTitle', 'calibrationText',
    'calibrationStatus', 'calibrationProgressBar', 'cancelCalibrationButton',
    'resetCalibrationButton', 'stagePauseButton', 'stageStopButton', 'stagePieceTitle',
    'transportStatus', 'setupTransportStatus', 'stageExpectedNote', 'stageDetectedNote',
    'stageProgressBar', 'scoreCanvas', 'expectedNote', 'detectedNote', 'frequencyValue',
    'confidenceValue', 'correctValue', 'errorValue', 'keyboardViewport', 'keyboard',
    'microphoneHint', 'progressBar', 'sessionSummary', 'toastTemplate'
  ];
  ids.forEach((id) => { els[id] = document.getElementById(id); });
}

function bindEvents() {
  els.micButton.addEventListener('click', toggleMicrophone);
  els.retryMicButton.addEventListener('click', enableMicrophone);
  els.playButton.addEventListener('click', startPractice);
  els.previewButton.addEventListener('click', startPreview);
  els.stagePauseButton.addEventListener('click', toggleStagePause);
  els.stageStopButton.addEventListener('click', stopSession);
  els.resetButton.addEventListener('click', resetSession);
  els.calibrateButton.addEventListener('click', startCalibration);
  els.cancelCalibrationButton.addEventListener('click', cancelCalibration);
  els.resetCalibrationButton.addEventListener('click', resetCalibration);
  els.pieceSelect.addEventListener('change', async () => {
    state.selectedPieceId = els.pieceSelect.value;
    await loadBuiltInPiece(state.selectedPieceId, true);
    saveSettings();
  });
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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.sessionKind && state.playing) toggleStagePause();
  });
}

async function loadBuiltInPiece(id, announce) {
  const path = BUILT_IN_PIECES[id] || BUILT_IN_PIECES.demo;
  try {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error('No se pudo cargar la pieza');
    const data = await response.json();
    setPiece(validatePiece(data));
    if (announce) showToast(`Pieza cargada: ${data.title}`);
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
    if (announce) showToast('No se pudo cargar la pieza seleccionada; se ha abierto una escala local.');
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
    state.selectedPieceId = 'custom';
    const customOption = Array.from(els.pieceSelect.options).find((option) => option.value === 'custom') || document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = piece.title;
    if (!customOption.parentElement) els.pieceSelect.appendChild(customOption);
    els.pieceSelect.value = 'custom';
    setPiece(piece);
    updateAllUI();
    showToast(`Pieza cargada: ${piece.title}`);
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'No se pudo leer la pieza.');
  } finally {
    event.target.value = '';
  }
}

async function toggleMicrophone() {
  if (state.micReady) {
    disableMicrophone();
    return;
  }
  await enableMicrophone();
}

async function enableMicrophone() {
  hideMicHelp();

  if (!window.isSecureContext) {
    showMicHelp(
      'Chrome exige una conexión segura',
      'Abre la app desde una dirección HTTPS. En un ordenador también funciona en http://localhost. Una dirección http://192.168… del ordenador no suele autorizar el micrófono en el móvil.'
    );
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    showMicHelp(
      'El navegador no ofrece acceso al micrófono',
      'Actualiza Chrome o prueba la app instalada como PWA desde una dirección HTTPS.'
    );
    return;
  }

  try {
    if (navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        if (permission.state === 'denied') {
          showMicHelp(
            'El permiso del micrófono está bloqueado',
            'En Chrome toca el icono de ajustes junto a la dirección → Permisos → Micrófono → Permitir. En Android revisa también Ajustes → Aplicaciones → Chrome → Permisos → Micrófono.'
          );
          return;
        }
      } catch (_) {
        // Algunos navegadores no admiten consultar este permiso; getUserMedia mostrará el diálogo.
      }
    }

    const preferredConstraints = {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 44100 }
      }
    };

    try {
      state.stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
    } catch (firstError) {
      if (firstError?.name === 'OverconstrainedError' || firstError?.name === 'ConstraintNotSatisfiedError') {
        state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        throw firstError;
      }
    }

    const audioContext = await getAudioContext();
    state.analyser = audioContext.createAnalyser();
    state.analyser.fftSize = 4096;
    state.analyser.smoothingTimeConstant = 0;
    state.audioBuffer = new Float32Array(state.analyser.fftSize);
    state.source = audioContext.createMediaStreamSource(state.stream);
    state.source.connect(state.analyser);
    state.micReady = true;
    els.micButton.textContent = 'Desactivar micrófono';
    els.micButton.classList.add('is-active');
    els.microphoneHint.textContent = 'Micrófono activo. Toca una nota clara y sostenida.';
    hideMicHelp();
    showToast('Micrófono activado. El audio se analiza localmente.');
    startLoop();
  } catch (error) {
    handleMicrophoneError(error);
  }
}

function handleMicrophoneError(error) {
  const name = error?.name || 'Error';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    showMicHelp(
      'Chrome no tiene permiso para usar el micrófono',
      'Toca el icono de ajustes junto a la dirección → Permisos → Micrófono → Permitir y recarga la app. En Android revisa también Ajustes → Aplicaciones → Chrome → Permisos → Micrófono. Si usas la PWA instalada, comprueba el permiso del sitio desde Chrome.'
    );
  } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    showMicHelp('No se encontró ningún micrófono', 'Comprueba que el dispositivo dispone de micrófono y que no está deshabilitado por el sistema.');
  } else if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    showMicHelp('El micrófono está ocupado o bloqueado', 'Cierra llamadas, grabadoras y otras aplicaciones que puedan estar usando el micrófono. Después vuelve a Chrome y pulsa Reintentar.');
  } else {
    showMicHelp('No se pudo activar el micrófono', `Chrome devolvió ${name}. Comprueba HTTPS, el permiso del sitio y el permiso de Android, y después pulsa Reintentar.`);
  }
}

function disableMicrophone() {
  state.stream?.getTracks().forEach((track) => track.stop());
  state.source?.disconnect();
  state.stream = null;
  state.source = null;
  state.analyser = null;
  state.audioBuffer = null;
  state.micReady = false;
  state.detectedMidi = null;
  state.rawDetectedMidi = null;
  state.detectedFrequency = null;
  state.detectedConfidence = 0;
  if (state.calibration.active) cancelCalibration();
  els.micButton.textContent = 'Activar micrófono';
  els.micButton.classList.remove('is-active');
  els.microphoneHint.textContent = 'Activa el micrófono para validar notas.';
  updateDynamicUI();
}

function showMicHelp(title, text) {
  els.micHelpTitle.textContent = title;
  els.micHelpText.textContent = text;
  els.micHelp.hidden = false;
}

function hideMicHelp() {
  els.micHelp.hidden = true;
}


async function startCalibration() {
  if (state.sessionKind) stopSession();

  if (!state.micReady) {
    await enableMicrophone();
    if (!state.micReady) return;
  }

  state.calibration.active = true;
  state.calibration.step = 0;
  state.calibration.readings = [];
  state.calibration.awaitingRelease = false;
  state.calibration.completed = false;
  state.rawDetectedMidi = null;
  state.detectedMidi = null;
  state.stableMidi = null;
  state.stableCount = 0;
  state.lastAcceptedAt = 0;
  els.calibrationPanel.hidden = false;
  els.calibrateButton.disabled = true;
  updateCalibrationUI();
  updateKeyboardHighlights();
  showToast('Calibración iniciada. Toca las tres teclas marcadas en orden.');
  startLoop();
}

function cancelCalibration() {
  const wasActive = state.calibration.active;
  state.calibration.active = false;
  state.calibration.awaitingRelease = false;
  state.calibration.step = 0;
  state.calibration.readings = [];
  state.stableMidi = null;
  state.stableCount = 0;
  els.calibrationPanel.hidden = true;
  els.calibrateButton.disabled = false;
  updateCalibrationButton();
  updateKeyboardHighlights();
  if (wasActive) showToast('Calibración cancelada.');
}

function resetCalibration() {
  state.pitchOffset = 0;
  state.calibration.active = false;
  state.calibration.awaitingRelease = false;
  state.calibration.completed = false;
  state.calibration.step = 0;
  state.calibration.readings = [];
  saveSettings();
  els.calibrationPanel.hidden = true;
  els.calibrateButton.disabled = false;
  updateCalibrationButton();
  updateKeyboardHighlights();
  updateDynamicUI();
  showToast('Calibración restablecida. Se usa la afinación detectada sin desplazamiento.');
}

function captureCalibrationNote(rawMidi, timestamp) {
  if (!state.calibration.active || state.calibration.awaitingRelease) return;

  const target = CALIBRATION_STEPS[state.calibration.step];
  if (!target) return;

  state.calibration.readings.push({ targetMidi: target.midi, detectedMidi: rawMidi });
  state.calibration.step += 1;
  state.calibration.awaitingRelease = true;
  state.lastAcceptedAt = timestamp;
  state.stableMidi = null;
  state.stableCount = 0;
  flashKey(target.midi, 'detected');

  if (state.calibration.step >= CALIBRATION_STEPS.length) finishCalibration();
  else updateCalibrationUI();
}

function finishCalibration() {
  const deltas = state.calibration.readings
    .map((reading) => reading.targetMidi - reading.detectedMidi)
    .sort((a, b) => a - b);
  const middle = Math.floor(deltas.length / 2);
  const medianDelta = deltas.length % 2 ? deltas[middle] : (deltas[middle - 1] + deltas[middle]) / 2;
  const proposedOffset = clamp(Math.round(medianDelta), -24, 24);
  const largestResidual = Math.max(...deltas.map((delta) => Math.abs(delta - proposedOffset)));

  if (largestResidual > 1) {
    state.calibration.step = 0;
    state.calibration.readings = [];
    state.calibration.awaitingRelease = true;
    state.calibration.completed = false;
    updateCalibrationUI();
    updateKeyboardHighlights();
    showToast('Las lecturas no fueron consistentes. Suelta la tecla y repite las tres notas.');
    return;
  }

  state.pitchOffset = proposedOffset;
  state.calibration.active = false;
  state.calibration.awaitingRelease = false;
  state.calibration.completed = true;
  saveSettings();
  els.calibrateButton.disabled = false;
  updateCalibrationButton();
  updateCalibrationUI();
  updateKeyboardHighlights();
  updateDynamicUI();
  showToast(`Calibración guardada: ${formatPitchOffset(state.pitchOffset)}.`);
}

function updateCalibrationUI() {
  if (!els.calibrationPanel) return;

  if (state.calibration.completed && !state.calibration.active) {
    els.calibrationTitle.textContent = 'Calibración completada';
    els.calibrationText.textContent = `La app aplicará ${formatPitchOffset(state.pitchOffset)} a las notas detectadas.`;
    els.calibrationStatus.textContent = `Ajuste actual: ${formatPitchOffset(state.pitchOffset)}`;
    els.calibrationProgressBar.style.width = '100%';
    els.cancelCalibrationButton.textContent = 'Cerrar';
    els.resetCalibrationButton.disabled = false;
    return;
  }

  const step = CALIBRATION_STEPS[state.calibration.step] || CALIBRATION_STEPS[0];
  const completedSteps = state.calibration.readings.length;
  els.calibrationTitle.textContent = `Paso ${Math.min(state.calibration.step + 1, CALIBRATION_STEPS.length)} de ${CALIBRATION_STEPS.length} · ${step.label}`;
  els.calibrationText.textContent = state.calibration.awaitingRelease
    ? `Suelta la tecla. Después: ${step.instruction}`
    : step.instruction;
  els.calibrationStatus.textContent = state.rawDetectedMidi === null
    ? 'Esperando una nota estable…'
    : `Lectura del micrófono: ${midiToNoteName(state.rawDetectedMidi)}`;
  els.calibrationProgressBar.style.width = `${completedSteps / CALIBRATION_STEPS.length * 100}%`;
  els.cancelCalibrationButton.textContent = 'Cancelar';
  els.resetCalibrationButton.disabled = true;
}

function updateCalibrationButton() {
  if (!els.calibrateButton) return;
  els.calibrateButton.textContent = state.pitchOffset === 0
    ? '🎹 Calibrar'
    : `🎹 Calibrar (${formatPitchOffsetShort(state.pitchOffset)})`;
}

function formatPitchOffset(offset) {
  if (offset === 0) return '0 semitonos';
  const sign = offset > 0 ? '+' : '−';
  const absolute = Math.abs(offset);
  if (absolute % 12 === 0) {
    const octaves = absolute / 12;
    return `${sign}${absolute} semitonos (${sign}${octaves} ${octaves === 1 ? 'octava' : 'octavas'})`;
  }
  return `${sign}${absolute} ${absolute === 1 ? 'semitono' : 'semitonos'}`;
}

function formatPitchOffsetShort(offset) {
  if (offset === 0) return 'sin ajuste';
  const sign = offset > 0 ? '+' : '−';
  const absolute = Math.abs(offset);
  if (absolute % 12 === 0) return `${sign}${absolute / 12} oct.`;
  return `${sign}${absolute} st`;
}

async function startPractice() {
  if (!state.piece) return;
  if (state.calibration.active) cancelCalibration();
  prepareSession('practice');
  state.playing = true;
  await enterLandscapeMode();
  if (!state.micReady) showToast('La práctica avanzará, pero debes activar el micrófono para validar notas.');
  startLoop();
  updateAllUI();
}

async function startPreview() {
  if (!state.piece) return;
  if (state.calibration.active) cancelCalibration();
  try {
    await getAudioContext();
  } catch (_) {
    showToast('Este navegador no permite reproducir la previsualización mediante Web Audio.');
    return;
  }
  prepareSession('preview');
  state.playing = true;
  await enterLandscapeMode();
  triggerPreviewNotes(-0.01, 0.01);
  startLoop();
  updateAllUI();
  showToast('Previsualización: escucha la pieza y sigue las teclas iluminadas.');
}

function prepareSession(kind) {
  stopSynthVoices();
  state.sessionKind = kind;
  state.playing = false;
  state.currentSeconds = 0;
  state.currentIndex = 0;
  state.lastFrameAt = performance.now();
  state.lastAcceptedAt = 0;
  state.previewPlayedIndexes = new Set();
  state.noteResults = state.piece.notes.map(() => 'pending');
  state.wrongAttempts = 0;
  state.stableMidi = null;
  state.stableCount = 0;
  document.body.classList.add('session-active');
  requestAnimationFrame(() => {
    resizeCanvas();
    renderKeyboard();
  });
}

function toggleStagePause() {
  if (!state.sessionKind) return;
  state.playing = !state.playing;
  state.lastFrameAt = performance.now();
  if (!state.playing) stopSynthVoices();
  startLoop();
  updateTransportUI();
}

function stopSession() {
  if (!state.sessionKind) return;
  const wasPractice = state.sessionKind === 'practice';
  state.playing = false;
  stopSynthVoices();
  if (wasPractice && state.mode === 'continuous') evaluateMissedNotes();
  state.sessionKind = null;
  document.body.classList.remove('session-active');
  exitFullscreenIfNeeded();
  requestAnimationFrame(() => {
    resizeCanvas();
    renderKeyboard();
    updateAllUI();
  });
}

function resetSession() {
  state.playing = false;
  state.sessionKind = null;
  state.currentSeconds = 0;
  state.currentIndex = 0;
  state.lastFrameAt = performance.now();
  state.lastAcceptedAt = 0;
  state.previewPlayedIndexes = new Set();
  state.noteResults = state.piece ? state.piece.notes.map(() => 'pending') : [];
  state.wrongAttempts = 0;
  state.detectedMidi = null;
  state.detectedFrequency = null;
  state.detectedConfidence = 0;
  stopSynthVoices();
  document.body.classList.remove('session-active');
  updateAllUI();
  drawScore();
}

async function enterLandscapeMode() {
  try {
    if (screen.orientation?.lock) await screen.orientation.lock('landscape');
  } catch (_) {
    // El bloqueo solo está disponible en algunos navegadores/PWA; la interfaz ya avisa en vertical.
  }
}

function exitFullscreenIfNeeded() {
  try {
    if (screen.orientation?.unlock) screen.orientation.unlock();
  } catch (_) {
    // No todos los navegadores exponen unlock.
  }
}

function updateOrientationState() {
  document.documentElement.dataset.orientation = window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
}

function startLoop() {
  if (state.animationFrame) return;
  const loop = (timestamp) => {
    state.animationFrame = requestAnimationFrame(loop);
    const delta = Math.min((timestamp - (state.lastFrameAt || timestamp)) / 1000, 0.08);
    state.lastFrameAt = timestamp;

    if (state.playing) advanceTransport(delta);
    if (state.micReady && state.sessionKind !== 'preview' && timestamp - state.lastAnalysisAt > 70) {
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
  if (!state.piece || !state.sessionKind) return;

  if (state.sessionKind === 'preview') {
    const previousSeconds = state.currentSeconds;
    state.currentSeconds += delta;
    triggerPreviewNotes(previousSeconds, state.currentSeconds);
    state.currentIndex = getTemporalNoteIndex();
    if (state.currentSeconds >= getPieceDurationSeconds()) finishSession();
  } else if (state.mode === 'continuous') {
    state.currentSeconds += delta;
    evaluateMissedNotes();
    state.currentIndex = getExpectedIndex();
    if (state.currentSeconds >= getPieceDurationSeconds()) finishSession();
  } else {
    const note = state.piece.notes[state.currentIndex];
    if (!note) finishSession();
    else state.currentSeconds = beatToSeconds(note.startBeat);
  }
  updateDynamicUI();
}

function triggerPreviewNotes(previousSeconds, currentSeconds) {
  if (!state.piece || state.sessionKind !== 'preview') return;
  state.piece.notes.forEach((note, index) => {
    if (state.previewPlayedIndexes.has(index)) return;
    const noteStart = beatToSeconds(note.startBeat);
    if (noteStart >= previousSeconds - 0.015 && noteStart <= currentSeconds + 0.025) {
      state.previewPlayedIndexes.add(index);
      playSynthNote(note.midi, beatToSeconds(note.durationBeats));
      flashKey(note.midi, 'preview');
    }
  });
}

async function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio API no disponible');
  if (!state.audioContext || state.audioContext.state === 'closed') state.audioContext = new AudioContextClass();
  if (state.audioContext.state === 'suspended') await state.audioContext.resume();
  return state.audioContext;
}

function playSynthNote(midi, durationSeconds) {
  const context = state.audioContext;
  if (!context || context.state !== 'running') return;
  const now = context.currentTime;
  const duration = clamp(durationSeconds, 0.12, 3.2);
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(4200, frequency * 7), now);
  filter.Q.value = 0.6;
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.012);
  master.gain.exponentialRampToValueAtTime(0.095, now + 0.11);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.32);
  filter.connect(master);
  master.connect(context.destination);

  const harmonics = [
    { ratio: 1, type: 'triangle', gain: 0.72 },
    { ratio: 2, type: 'sine', gain: 0.20 },
    { ratio: 3, type: 'sine', gain: 0.08 }
  ];

  harmonics.forEach((harmonic) => {
    const oscillator = context.createOscillator();
    const harmonicGain = context.createGain();
    oscillator.type = harmonic.type;
    oscillator.frequency.setValueAtTime(frequency * harmonic.ratio, now);
    harmonicGain.gain.value = harmonic.gain;
    oscillator.connect(harmonicGain);
    harmonicGain.connect(filter);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.35);
    state.activeSynthNodes.add(oscillator);
    oscillator.addEventListener('ended', () => state.activeSynthNodes.delete(oscillator), { once: true });
  });
}

function stopSynthVoices() {
  state.activeSynthNodes.forEach((node) => {
    try { node.stop(); } catch (_) { /* ya detenido */ }
  });
  state.activeSynthNodes.clear();
}

function analyzeMicrophone(timestamp) {
  if (!state.analyser || !state.audioBuffer || !state.audioContext) return;
  state.analyser.getFloatTimeDomainData(state.audioBuffer);
  const rms = calculateRms(state.audioBuffer);

  if (rms < 0.012) {
    state.detectedMidi = null;
    state.rawDetectedMidi = null;
    state.detectedFrequency = null;
    state.detectedConfidence = 0;
    state.stableMidi = null;
    state.stableCount = 0;
    if (state.calibration.active && state.calibration.awaitingRelease) {
      state.calibration.awaitingRelease = false;
      updateCalibrationUI();
      updateKeyboardHighlights();
    }
    updateDynamicUI();
    return;
  }

  const result = yinPitch(state.audioBuffer, state.audioContext.sampleRate, 0.13);
  if (!result || result.frequency < 27 || result.frequency > 4300) return;

  const rawMidi = Math.round(frequencyToMidi(result.frequency));
  if (rawMidi < 21 || rawMidi > 108) return;
  const adjustedMidi = rawMidi + state.pitchOffset;

  state.rawDetectedMidi = rawMidi;
  state.detectedMidi = adjustedMidi >= 21 && adjustedMidi <= 108 ? adjustedMidi : null;
  state.detectedFrequency = result.frequency;
  state.detectedConfidence = result.confidence;

  if (state.stableMidi === rawMidi) state.stableCount += 1;
  else {
    state.stableMidi = rawMidi;
    state.stableCount = 1;
  }

  if (state.calibration.active) updateCalibrationUI();

  if (state.stableCount >= 3 && result.confidence >= 0.72 && timestamp - state.lastAcceptedAt > 180) {
    if (state.calibration.active) captureCalibrationNote(rawMidi, timestamp);
    else if (state.detectedMidi !== null) acceptDetectedNote(state.detectedMidi, timestamp);
  }
  updateDynamicUI();
}

function acceptDetectedNote(midi, timestamp) {
  if (!state.playing || state.sessionKind !== 'practice' || !state.piece) return;
  const expectedIndex = state.mode === 'wait' ? state.currentIndex : getExpectedIndex();
  const expected = state.piece.notes[expectedIndex];
  if (!expected) return;

  if (midi === expected.midi) {
    if (state.noteResults[expectedIndex] !== 'correct') state.noteResults[expectedIndex] = 'correct';
    state.lastAcceptedAt = timestamp;
    flashKey(expected.midi, 'detected');

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
  const graceSeconds = 0.45;
  state.piece.notes.forEach((note, index) => {
    const noteEnd = beatToSeconds(note.startBeat + note.durationBeats);
    if (state.currentSeconds > noteEnd + graceSeconds && state.noteResults[index] === 'pending') {
      state.noteResults[index] = 'missed';
    }
  });
}

function getExpectedIndex() {
  if (!state.piece) return 0;
  for (let index = 0; index < state.piece.notes.length; index += 1) {
    const result = state.noteResults[index];
    if (result === 'correct' || result === 'missed') continue;
    const note = state.piece.notes[index];
    const noteEnd = beatToSeconds(note.startBeat + note.durationBeats) + 0.45;
    if (state.currentSeconds <= noteEnd) return index;
  }
  return state.piece.notes.length - 1;
}

function getTemporalNoteIndex() {
  if (!state.piece) return 0;
  const beat = secondsToBeat(state.currentSeconds);
  let current = 0;
  for (let index = 0; index < state.piece.notes.length; index += 1) {
    if (state.piece.notes[index].startBeat <= beat + 0.02) current = index;
    else break;
  }
  return current;
}

function finishSession() {
  const completedKind = state.sessionKind;
  state.playing = false;
  stopSynthVoices();
  if (completedKind === 'practice' && state.mode === 'continuous') evaluateMissedNotes();
  state.sessionKind = null;
  document.body.classList.remove('session-active');
  exitFullscreenIfNeeded();
  requestAnimationFrame(() => {
    resizeCanvas();
    renderKeyboard();
    updateAllUI();
  });
  showToast(completedKind === 'preview' ? 'Previsualización terminada.' : 'Sesión terminada. Revisa el resumen de resultados.');
}

function updateAllUI() {
  if (!state.piece) return;
  els.pieceTitle.textContent = state.piece.title;
  els.pieceMeta.textContent = `${state.piece.composer} · ${state.piece.description}`;
  els.stagePieceTitle.textContent = state.piece.title;
  els.tempoInput.value = String(state.tempo);
  els.tempoValue.textContent = String(state.tempo);
  els.modeSelect.value = state.mode;
  els.keyboardSizeSelect.value = String(state.keyboardSize);
  els.hintsToggle.checked = state.showHints;
  if (BUILT_IN_PIECES[state.selectedPieceId]) els.pieceSelect.value = state.selectedPieceId;
  updateCalibrationButton();
  updateTransportUI();
  updateDynamicUI();
  updateProgressUI();
}

function updateTransportUI() {
  let status = 'Preparado';
  if (state.sessionKind === 'preview') status = state.playing ? 'Previsualizando' : 'Previsualización pausada';
  else if (state.sessionKind === 'practice' && state.playing && state.mode === 'wait') status = 'Esperando nota';
  else if (state.sessionKind === 'practice' && state.playing) status = 'Practicando';
  else if (state.sessionKind === 'practice') status = 'Práctica pausada';
  else if (state.currentSeconds > 0) status = 'Pausado';

  els.transportStatus.textContent = status;
  els.setupTransportStatus.textContent = status;
  els.stagePauseButton.textContent = state.playing ? 'Ⅱ' : '▶';
  els.stagePauseButton.setAttribute('aria-label', state.playing ? 'Pausar' : 'Continuar');
  els.playButton.textContent = '▶ Practicar';
}

function updateDynamicUI() {
  if (!state.piece) return;
  const expectedIndex = state.sessionKind === 'preview' ? getTemporalNoteIndex() : (state.mode === 'wait' ? state.currentIndex : getExpectedIndex());
  const expected = state.piece.notes[expectedIndex];
  const expectedText = expected ? midiToNoteName(expected.midi) : 'Fin';
  const detectedText = state.detectedMidi === null ? '—' : midiToNoteName(state.detectedMidi);

  els.expectedNote.textContent = expectedText;
  els.stageExpectedNote.textContent = expectedText;
  els.detectedNote.textContent = detectedText;
  els.stageDetectedNote.textContent = state.sessionKind === 'preview' ? '—' : detectedText;
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
  let progress;
  if (state.sessionKind === 'preview' || state.mode === 'continuous') {
    progress = Math.min(state.currentSeconds / getPieceDurationSeconds(), 1);
  } else {
    progress = state.currentIndex / total;
  }
  const percent = `${Math.max(0, Math.min(100, progress * 100))}%`;
  els.progressBar.style.width = percent;
  els.stageProgressBar.style.width = percent;
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
  if (!els.keyboardViewport || !els.keyboard) return;
  const range = KEYBOARD_RANGES[state.keyboardSize] || KEYBOARD_RANGES[61];
  const [startMidi, endMidi] = range;
  const whiteMidis = [];
  for (let midi = startMidi; midi <= endMidi; midi += 1) {
    if (!BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12)) whiteMidis.push(midi);
  }

  const whiteWidthPercent = 100 / whiteMidis.length;
  const blackWidthPercent = whiteWidthPercent * 0.64;
  els.keyboard.innerHTML = '';
  els.keyboard.style.width = '100%';
  els.keyboard.style.minWidth = '0';
  els.keyboard.classList.toggle('keyboard-37', state.keyboardSize === 37);

  let whiteIndex = 0;
  for (let midi = startMidi; midi <= endMidi; midi += 1) {
    const pitchClass = ((midi % 12) + 12) % 12;
    const isBlack = BLACK_PITCH_CLASSES.has(pitchClass);
    const key = document.createElement('div');
    key.className = `piano-key ${isBlack ? 'black' : 'white'}`;
    key.dataset.midi = String(midi);
    key.title = midiToNoteName(midi);

    if (isBlack) {
      key.style.width = `${blackWidthPercent}%`;
      key.style.left = `${whiteIndex * whiteWidthPercent - blackWidthPercent / 2}%`;
    } else {
      key.style.width = `${whiteWidthPercent}%`;
      key.style.left = `${whiteIndex * whiteWidthPercent}%`;

      if (state.keyboardSize === 37) {
        const markerData = SOLFEGE_MARKERS[pitchClass];
        if (markerData) {
          const marker = document.createElement('span');
          marker.className = `note-marker ${markerData.className}`;
          marker.textContent = markerData.text;
          marker.setAttribute('aria-hidden', 'true');
          key.appendChild(marker);
        }
      } else if (pitchClass === 0) {
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
  els.keyboard.querySelectorAll('.piano-key.expected, .piano-key.preview-current, .piano-key.calibration-target').forEach((key) => {
    key.classList.remove('expected', 'preview-current', 'calibration-target');
  });
  if (!state.piece) return;

  if (state.calibration.active) {
    const target = CALIBRATION_STEPS[state.calibration.step];
    if (target) {
      const calibrationKey = els.keyboard.querySelector(`[data-midi="${target.midi}"]`);
      if (calibrationKey) calibrationKey.classList.add('calibration-target');
    }
    return;
  }

  let midi = null;
  let className = 'expected';
  if (state.sessionKind === 'preview') {
    const note = state.piece.notes[getTemporalNoteIndex()];
    midi = note?.midi ?? null;
    className = 'preview-current';
  } else if (state.showHints) {
    const note = state.mode === 'wait' ? state.piece.notes[state.currentIndex] : state.piece.notes[getExpectedIndex()];
    midi = note?.midi ?? null;
  }

  if (midi === null) return;
  const key = els.keyboard.querySelector(`[data-midi="${midi}"]`);
  if (key) key.classList.add(className);
}

function flashKey(midi, className) {
  const key = els.keyboard.querySelector(`[data-midi="${midi}"]`);
  if (!key) return;
  key.classList.add(className, 'active');
  window.setTimeout(() => key.classList.remove(className, 'active'), 260);
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
  const lineGap = Math.min(22, height * 0.09);
  const playheadX = Math.min(width * 0.23, 210);
  const pixelsPerBeat = Math.max(56, width / 9.2);
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

  const activeIndex = state.sessionKind === 'preview' ? getTemporalNoteIndex() : (state.mode === 'wait' ? state.currentIndex : getExpectedIndex());
  state.piece.notes.forEach((note, index) => {
    const x = playheadX + (note.startBeat - currentBeat) * pixelsPerBeat;
    if (x < -35 || x > width + 35) return;
    const y = midiToStaffY(note.midi, staffTop, lineGap);
    const status = state.noteResults[index];
    const isCurrent = index === activeIndex;

    let noteColor = '#232a33';
    if (state.sessionKind !== 'preview' && status === 'correct') noteColor = '#20a877';
    else if (state.sessionKind !== 'preview' && (status === 'wrong' || status === 'missed')) noteColor = '#e7485b';
    else if (isCurrent) noteColor = '#526ff3';

    context.save();
    context.fillStyle = noteColor;
    context.translate(x, y);
    context.rotate(-0.28);
    context.beginPath();
    context.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.strokeStyle = noteColor;
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
  const referenceMidi = 71;
  const semitoneOffset = midi - referenceMidi;
  return staffTop + lineGap * 2 - semitoneOffset * (lineGap / 4);
}

function yinPitch(buffer, sampleRate, threshold) {
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
    showHints: state.showHints,
    pitchOffset: state.pitchOffset,
    selectedPieceId: BUILT_IN_PIECES[state.selectedPieceId] ? state.selectedPieceId : 'demo'
  }));
}

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('pianoCoachSettings') || '{}');
    if (saved.mode === 'continuous' || saved.mode === 'wait') state.mode = saved.mode;
    if (KEYBOARD_RANGES[saved.keyboardSize]) state.keyboardSize = Number(saved.keyboardSize);
    if (typeof saved.showHints === 'boolean') state.showHints = saved.showHints;
    if (Number.isInteger(saved.pitchOffset) && saved.pitchOffset >= -24 && saved.pitchOffset <= 24) state.pitchOffset = saved.pitchOffset;
    if (BUILT_IN_PIECES[saved.selectedPieceId]) state.selectedPieceId = saved.selectedPieceId;
  } catch (_) {
    // Se conservan los valores por defecto si el almacenamiento está dañado.
  }
}

function showToast(message) {
  document.querySelectorAll('.toast').forEach((toast) => toast.remove());
  const fragment = els.toastTemplate.content.cloneNode(true);
  const toast = fragment.querySelector('.toast');
  toast.textContent = message;
  document.body.appendChild(fragment);
  window.setTimeout(() => toast.remove(), 4300);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
