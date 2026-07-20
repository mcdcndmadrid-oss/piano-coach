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
  twinkle: './pieces/twinkle.json',
  'frere-jacques': './pieces/frere-jacques.json',
  'cumpleanos-feliz': './pieces/cumpleanos-feliz.json',
  'marcha-real': './pieces/marcha-real.mxl'
};
const BUILT_IN_PIECE_TITLES = {
  'marcha-real': 'Marcha Real (Himno Nacional de España)'
};
const BUILT_IN_PIECE_DESCRIPTIONS = {
  'marcha-real': 'Himno Nacional de España · marcha instrumental, sin letra oficial'
};

// Copia fija de "Oda a la alegría" (idéntica a pieces/demo.json) para cuando fetch()
// no puede leer los archivos de pieces/ — típicamente al abrir index.html con doble
// clic (file://), donde el navegador bloquea las peticiones a archivos locales.
const FALLBACK_PIECE = {
  title: 'Oda a la alegría (copia local sin conexión)',
  composer: 'L. van Beethoven',
  tempo: 92,
  timeSignature: '4/4',
  description: 'No se pudo descargar la pieza seleccionada, así que se cargó esta copia integrada en la app. Sirve la carpeta con un servidor local (ver DESCRIPCION_PROYECTO.md) para acceder a todas las piezas.',
  notes: [
    { midi: 64, startBeat: 0, durationBeats: 1 }, { midi: 64, startBeat: 1, durationBeats: 1 },
    { midi: 65, startBeat: 2, durationBeats: 1 }, { midi: 67, startBeat: 3, durationBeats: 1 },
    { midi: 67, startBeat: 4, durationBeats: 1 }, { midi: 65, startBeat: 5, durationBeats: 1 },
    { midi: 64, startBeat: 6, durationBeats: 1 }, { midi: 62, startBeat: 7, durationBeats: 1 },
    { midi: 60, startBeat: 8, durationBeats: 1 }, { midi: 60, startBeat: 9, durationBeats: 1 },
    { midi: 62, startBeat: 10, durationBeats: 1 }, { midi: 64, startBeat: 11, durationBeats: 1 },
    { midi: 64, startBeat: 12, durationBeats: 1.5 }, { midi: 62, startBeat: 13.5, durationBeats: 0.5 },
    { midi: 62, startBeat: 14, durationBeats: 2 },

    { midi: 64, startBeat: 16, durationBeats: 1 }, { midi: 64, startBeat: 17, durationBeats: 1 },
    { midi: 65, startBeat: 18, durationBeats: 1 }, { midi: 67, startBeat: 19, durationBeats: 1 },
    { midi: 67, startBeat: 20, durationBeats: 1 }, { midi: 65, startBeat: 21, durationBeats: 1 },
    { midi: 64, startBeat: 22, durationBeats: 1 }, { midi: 62, startBeat: 23, durationBeats: 1 },
    { midi: 60, startBeat: 24, durationBeats: 1 }, { midi: 60, startBeat: 25, durationBeats: 1 },
    { midi: 62, startBeat: 26, durationBeats: 1 }, { midi: 64, startBeat: 27, durationBeats: 1 },
    { midi: 62, startBeat: 28, durationBeats: 1 }, { midi: 60, startBeat: 29, durationBeats: 1 },
    { midi: 60, startBeat: 30, durationBeats: 2 },

    { midi: 62, startBeat: 32, durationBeats: 1 }, { midi: 62, startBeat: 33, durationBeats: 1 },
    { midi: 64, startBeat: 34, durationBeats: 1 }, { midi: 60, startBeat: 35, durationBeats: 1 },
    { midi: 62, startBeat: 36, durationBeats: 1 }, { midi: 64, startBeat: 37, durationBeats: 1.5 },
    { midi: 65, startBeat: 38.5, durationBeats: 0.5 }, { midi: 64, startBeat: 39, durationBeats: 1 },
    { midi: 60, startBeat: 40, durationBeats: 1 }, { midi: 62, startBeat: 41, durationBeats: 1 },
    { midi: 64, startBeat: 42, durationBeats: 1 }, { midi: 65, startBeat: 43, durationBeats: 1 },
    { midi: 64, startBeat: 44, durationBeats: 1 }, { midi: 62, startBeat: 45, durationBeats: 1 },
    { midi: 60, startBeat: 46, durationBeats: 1 }, { midi: 62, startBeat: 47, durationBeats: 1 },

    { midi: 67, startBeat: 48, durationBeats: 4 },

    { midi: 64, startBeat: 52, durationBeats: 1 }, { midi: 64, startBeat: 53, durationBeats: 1 },
    { midi: 65, startBeat: 54, durationBeats: 1 }, { midi: 67, startBeat: 55, durationBeats: 1 },
    { midi: 67, startBeat: 56, durationBeats: 1 }, { midi: 65, startBeat: 57, durationBeats: 1 },
    { midi: 64, startBeat: 58, durationBeats: 1 }, { midi: 62, startBeat: 59, durationBeats: 1 },
    { midi: 60, startBeat: 60, durationBeats: 1 }, { midi: 60, startBeat: 61, durationBeats: 1 },
    { midi: 62, startBeat: 62, durationBeats: 1 }, { midi: 64, startBeat: 63, durationBeats: 1 },

    { midi: 60, startBeat: 64, durationBeats: 4 }
  ]
};
const CALIBRATION_STEPS = [
  { midi: 60, label: 'Do4', instruction: 'Toca y mantén el Do central marcado en el teclado de la app.' },
  { midi: 64, label: 'Mi4', instruction: 'Toca el Mi marcado, en la misma octava que el Do anterior.' },
  { midi: 67, label: 'Sol4', instruction: 'Toca el Sol marcado, en la misma octava.' }
];

const AUDIO_CONFIG = { FFT_SIZE: 4096, SMOOTHING_TIME_CONSTANT: 0, ANALYSIS_INTERVAL_MS: 70, DRAW_INTERVAL_MS: 16 };

const PITCH_CONFIG = {
  MIN_FREQUENCY_HZ: 27,
  MAX_FREQUENCY_HZ: 4300, // antes 4300 en analyzeMicrophone pero 4200 dentro de yinPitch: se unifican aquí.
  YIN_THRESHOLD: 0.13,
  YIN_WINDOW_CAP: 2048,
  YIN_MIN_COMPARISON_LENGTH: 256,
  MIDI_MIN: 21,
  MIDI_MAX: 108
};

const ONSET_CONFIG = {
  RMS_SILENCE_ENTER: 0.009,
  RMS_SILENCE_HOLD_MS: 130,
  RMS_SUSTAIN_GATE: 0.012,
  RMS_ONSET_DELTA: 0.02,
  RMS_SMOOTHING_ALPHA: 0.35,
  ONSET_ACTIVE_WINDOW_MS: 150,
  STABLE_FRAMES_REQUIRED: 3,
  STABLE_FRAMES_REQUIRED_ON_ONSET: 1,
  CONFIDENCE_ACCEPT_THRESHOLD: 0.72,
  ACCEPT_DEBOUNCE_MS: 180
};

const state = {
  piece: null,
  selectedPieceId: 'demo',
  tempo: 92,
  mode: 'continuous',
  sessionKind: null,
  playing: false,
  continuousStarted: false,
  wakeLock: null,
  wakeLockRequest: null,
  micReady: false,
  showHints: true,
  showNoteNames: true,
  simpleStaffMode: false,
  keyboardSize: 37,
  segments: [],
  selectedSegmentId: 'all',
  segment: null,
  isDraggingScore: false,
  dragStartClientX: 0,
  dragStartBeat: 0,
  lastPixelsPerBeat: 60,
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
  smoothedRms: 0,
  previousSmoothedRms: 0,
  onsetActive: false,
  onsetDetectedAt: 0,
  belowSilenceEnterSince: null,
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
  try {
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
  } catch (error) {
    reportStartupFailure(error);
  }
}

// Si init() falla (p. ej. una versión en caché de index.html no coincide con la de
// app.js tras una actualización), se muestra el error en vez de dejar la pantalla
// congelada en "Cargando pieza…" sin explicación.
function reportStartupFailure(error) {
  console.error('Piano Coach no pudo iniciar:', error);
  const titleEl = document.getElementById('pieceTitle');
  const metaEl = document.getElementById('pieceMeta');
  if (titleEl) titleEl.textContent = 'No se pudo iniciar la app';
  if (metaEl) {
    metaEl.textContent = `${error?.message || error}. Prueba a recargar forzando la caché (recarga con el navegador cerrado y abierto de nuevo, o borra datos del sitio) y vuelve a intentarlo.`;
  }
}

function cacheElements() {
  const ids = [
    'pieceTitle', 'pieceMeta', 'pieceSelect', 'micButton', 'playButton', 'previewButton',
    'resetButton', 'calibrateButton', 'modeSelect', 'segmentSelect', 'tempoInput', 'tempoValue', 'keyboardSizeSelect',
    'hintsToggle', 'noteNamesToggle', 'simpleStaffToggle', 'pieceFileInput', 'micHelp', 'micHelpTitle', 'micHelpText',
    'retryMicButton', 'calibrationPanel', 'calibrationTitle', 'calibrationText',
    'calibrationStatus', 'calibrationProgressBar', 'cancelCalibrationButton',
    'resetCalibrationButton', 'stagePauseButton', 'stageRestartButton', 'stageStopButton', 'stagePieceTitle',
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
  els.stageRestartButton.addEventListener('click', restartSession);
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
  els.noteNamesToggle.addEventListener('change', () => {
    state.showNoteNames = els.noteNamesToggle.checked;
    drawScore();
    saveSettings();
  });
  els.simpleStaffToggle.addEventListener('change', () => {
    state.simpleStaffMode = els.simpleStaffToggle.checked;
    drawScore();
    saveSettings();
  });
  els.segmentSelect.addEventListener('change', () => {
    state.selectedSegmentId = els.segmentSelect.value;
    applySelectedSegment();
    resetSession();
    saveSettings();
  });
  els.pieceFileInput.addEventListener('change', importPieceFile);
  bindScoreDragEvents();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.sessionKind && state.playing) toggleStagePause();
    if (!document.hidden && (state.sessionKind || state.calibration.active)) requestScreenWakeLock();
  });
  window.addEventListener('pagehide', releaseScreenWakeLock);
}

async function loadBuiltInPiece(id, announce) {
  const path = BUILT_IN_PIECES[id] || BUILT_IN_PIECES.demo;
  const isMusicXml = /\.(musicxml|xml|mxl)$/i.test(path);
  try {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error('No se pudo cargar la pieza');
    let piece;
    let title;
    if (isMusicXml) {
      if (!window.MusicXmlImporter?.convert) throw new Error('El conversor MusicXML no está disponible.');
      const result = await window.MusicXmlImporter.convert(await response.arrayBuffer(), path.split('/').pop());
      piece = validatePiece(result.piece);
      title = piece.title;
    } else {
      const data = await response.json();
      piece = validatePiece(data);
      title = data.title;
    }
    if (BUILT_IN_PIECE_TITLES[id]) piece.title = BUILT_IN_PIECE_TITLES[id];
    if (BUILT_IN_PIECE_DESCRIPTIONS[id]) piece.description = BUILT_IN_PIECE_DESCRIPTIONS[id];
    title = piece.title;
    setPiece(piece);
    if (announce) showToast(`Pieza cargada: ${title}`);
  } catch (error) {
    setPiece(validatePiece(FALLBACK_PIECE));
    if (announce) {
      showToast('No se pudo descargar la pieza. Si abriste index.html con doble clic, usa un servidor local (ver DESCRIPCION_PROYECTO.md) para acceder a todas las piezas. Mientras tanto: Oda a la alegría.');
    }
  }
}

function validatePiece(input) {
  if (!input || typeof input !== 'object') throw new Error('El archivo no contiene un objeto JSON válido.');
  return Array.isArray(input.staves) ? validateStructuredPiece(input) : validateFlatPiece(input);
}

function validateFlatPiece(input) {
  if (!Array.isArray(input.notes) || input.notes.length === 0) throw new Error('La pieza debe contener al menos una nota.');

  const notes = input.notes.map((note, index) => {
    const midi = Number(note.midi);
    const startBeat = Number(note.startBeat);
    const durationBeats = Number(note.durationBeats ?? 1);
    if (!Number.isFinite(midi) || midi < 21 || midi > 108) throw new Error(`Nota ${index + 1}: midi debe estar entre 21 y 108.`);
    if (!Number.isFinite(startBeat) || startBeat < 0) throw new Error(`Nota ${index + 1}: startBeat no es válido.`);
    if (!Number.isFinite(durationBeats) || durationBeats <= 0) throw new Error(`Nota ${index + 1}: durationBeats no es válido.`);
    const fallback = durationToNoteType(durationBeats);
    return {
      midi: Math.round(midi),
      startBeat,
      durationBeats,
      noteType: fallback.noteType,
      dots: fallback.dots,
      tied: null,
      articulations: [],
      chordWith: null,
      staff: 0,
      voice: 0,
      hand: note.hand || null
    };
  }).sort((a, b) => a.startBeat - b.startBeat);

  return finalizePiece({
    title: String(input.title || 'Pieza sin título'),
    composer: String(input.composer || 'Autor desconocido'),
    tempo: clamp(Number(input.tempo) || 80, 40, 180),
    timeSignature: String(input.timeSignature || '4/4'),
    description: String(input.description || 'Pieza importada'),
    keySignature: { fifths: 0, mode: 'major' },
    staves: [{ clef: 'treble', voices: [{ id: 0, notes }] }],
    dynamics: []
  });
}

function validateStructuredPiece(input) {
  if (!Array.isArray(input.staves) || input.staves.length === 0) throw new Error('La pieza debe contener al menos un pentagrama.');

  const staves = input.staves.map((staffInput, staffIndex) => {
    const clef = staffInput.clef === 'bass' ? 'bass' : 'treble';
    const voicesInput = Array.isArray(staffInput.voices) ? staffInput.voices : [];
    const voices = voicesInput.map((voiceInput, voiceIndex) => {
      const notesInput = Array.isArray(voiceInput.notes) ? voiceInput.notes : [];
      const notes = notesInput.map((note, index) => {
        const midi = Number(note.midi);
        const startBeat = Number(note.startBeat);
        const durationBeats = Number(note.durationBeats ?? 1);
        const label = `Pentagrama ${staffIndex + 1}, voz ${voiceIndex + 1}, nota ${index + 1}`;
        if (!Number.isFinite(midi) || midi < 21 || midi > 108) throw new Error(`${label}: midi debe estar entre 21 y 108.`);
        if (!Number.isFinite(startBeat) || startBeat < 0) throw new Error(`${label}: startBeat no es válido.`);
        if (!Number.isFinite(durationBeats) || durationBeats <= 0) throw new Error(`${label}: durationBeats no es válido.`);
        const fallback = durationToNoteType(durationBeats);
        return {
          midi: Math.round(midi),
          startBeat,
          durationBeats,
          noteType: note.noteType || fallback.noteType,
          dots: Number.isInteger(note.dots) ? note.dots : fallback.dots,
          tied: note.tied || null,
          articulations: Array.isArray(note.articulations) ? note.articulations : [],
          chordWith: Number.isInteger(note.chordWith) ? note.chordWith : null,
          staff: staffIndex,
          voice: voiceIndex,
          hand: note.hand || null
        };
      }).sort((a, b) => a.startBeat - b.startBeat);
      return { id: Number.isInteger(voiceInput.id) ? voiceInput.id : voiceIndex, notes };
    });
    return { clef, voices };
  });

  const dynamics = Array.isArray(input.dynamics)
    ? input.dynamics.map((item) => ({ beat: Number(item.beat) || 0, text: String(item.text || '') }))
    : [];

  return finalizePiece({
    title: String(input.title || 'Pieza sin título'),
    composer: String(input.composer || 'Autor desconocido'),
    tempo: clamp(Number(input.tempo) || 80, 40, 180),
    timeSignature: String(input.timeSignature || '4/4'),
    description: String(input.description || 'Pieza importada'),
    keySignature: {
      fifths: Number.isFinite(Number(input.keySignature?.fifths)) ? Math.round(Number(input.keySignature.fifths)) : 0,
      mode: input.keySignature?.mode === 'minor' ? 'minor' : 'major'
    },
    staves,
    dynamics
  });
}

function finalizePiece(piece) {
  const allNotes = [];
  piece.staves.forEach((staff) => {
    staff.voices.forEach((voice) => {
      voice.notes.forEach((note) => allNotes.push(note));
    });
  });
  if (allNotes.length === 0) throw new Error('La pieza debe contener al menos una nota.');
  allNotes.sort((a, b) => a.startBeat - b.startBeat);

  const practiceVoice = piece.staves[0]?.voices[0];
  const practiceNotes = practiceVoice ? practiceVoice.notes.slice().sort((a, b) => a.startBeat - b.startBeat) : [];
  practiceNotes.forEach((note, index) => { note.practiceIndex = index; });

  return { ...piece, allNotes, practiceNotes };
}

function durationToNoteType(durationBeats) {
  const d = Number(durationBeats) || 1;
  const close = (a, b) => Math.abs(a - b) < 0.01;
  if (d >= 4 || close(d, 4)) return { noteType: 'whole', dots: 0 };
  if (close(d, 3)) return { noteType: 'half', dots: 1 };
  if (close(d, 2)) return { noteType: 'half', dots: 0 };
  if (close(d, 1.5)) return { noteType: 'quarter', dots: 1 };
  if (close(d, 1)) return { noteType: 'quarter', dots: 0 };
  if (close(d, 0.75)) return { noteType: 'eighth', dots: 1 };
  if (close(d, 0.5)) return { noteType: 'eighth', dots: 0 };
  if (close(d, 0.375)) return { noteType: '16th', dots: 1 };
  if (close(d, 0.25)) return { noteType: '16th', dots: 0 };
  if (d > 2) return { noteType: 'half', dots: 0 };
  return { noteType: d < 0.5 ? 'eighth' : 'quarter', dots: 0 };
}

function setPiece(piece) {
  state.piece = piece;
  state.tempo = piece.tempo;
  els.tempoInput.value = String(state.tempo);
  state.segments = buildSegments(piece);
  state.selectedSegmentId = 'all';
  populateSegmentSelect();
  applySelectedSegment();
  resetSession();
}

const SEGMENT_MEASURES = 4;

function buildSegments(piece) {
  const beatsPerMeasure = Number(piece.timeSignature.split('/')[0]) || 4;
  const lastEndBeat = piece.allNotes.reduce((max, note) => Math.max(max, note.startBeat + note.durationBeats), 0);
  const totalMeasures = Math.max(1, Math.ceil(lastEndBeat / beatsPerMeasure));
  const segments = [];
  for (let startMeasure = 0; startMeasure < totalMeasures; startMeasure += SEGMENT_MEASURES) {
    const endMeasure = Math.min(startMeasure + SEGMENT_MEASURES, totalMeasures);
    const label = endMeasure - startMeasure === 1
      ? `Compás ${startMeasure + 1}`
      : `Compases ${startMeasure + 1}-${endMeasure}`;
    segments.push({
      id: `m${startMeasure + 1}`,
      startBeat: startMeasure * beatsPerMeasure,
      endBeat: endMeasure * beatsPerMeasure,
      label
    });
  }
  return segments;
}

function populateSegmentSelect() {
  if (!els.segmentSelect) return;
  els.segmentSelect.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'Toda la pieza';
  els.segmentSelect.appendChild(allOption);
  state.segments.forEach((segment) => {
    const option = document.createElement('option');
    option.value = segment.id;
    option.textContent = segment.label;
    els.segmentSelect.appendChild(option);
  });
  els.segmentSelect.value = state.selectedSegmentId;
}

function applySelectedSegment() {
  state.segment = state.segments.find((segment) => segment.id === state.selectedSegmentId) || null;
}

function getSegmentStartSeconds() {
  return state.segment ? beatToSeconds(state.segment.startBeat) : 0;
}

function getFirstActiveNoteIndex() {
  if (!state.segment || !state.piece) return 0;
  const index = state.piece.practiceNotes.findIndex((note) => note.startBeat >= state.segment.startBeat && note.startBeat < state.segment.endBeat);
  return index === -1 ? 0 : index;
}

function buildNoteResults() {
  return state.piece.practiceNotes.map((note) => {
    if (state.segment && (note.startBeat < state.segment.startBeat || note.startBeat >= state.segment.endBeat)) return 'excluded';
    return 'pending';
  });
}

function isWithinActiveSegment(beat) {
  return !state.segment || (beat >= state.segment.startBeat && beat < state.segment.endBeat);
}

async function importPieceFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const extension = file.name.split('.').pop()?.toLowerCase();
    let piece;
    let successMessage;

    if (extension === 'mid' || extension === 'midi') {
      if (!window.MidiImporter?.convert) throw new Error('El conversor MIDI no está disponible. Recarga la aplicación.');
      const result = window.MidiImporter.convert(await file.arrayBuffer(), file.name);
      piece = validatePiece(result.piece);
      successMessage = `MIDI convertido: ${piece.title} · ${piece.allNotes.length} notas · ${result.details.selectedTrack}`;
    } else if (extension === 'musicxml' || extension === 'xml' || extension === 'mxl') {
      if (!window.MusicXmlImporter?.convert) throw new Error('El conversor MusicXML no está disponible. Recarga la aplicación.');
      const result = await window.MusicXmlImporter.convert(await file.arrayBuffer(), file.name);
      piece = validatePiece(result.piece);
      successMessage = `MusicXML importado: ${piece.title} · ${piece.allNotes.length} notas · ${result.details.staffCount} pentagrama(s)`;
    } else {
      piece = validatePiece(JSON.parse(await file.text()));
      successMessage = `Pieza cargada: ${piece.title}`;
    }

    setCustomPiece(piece);
    showToast(successMessage);
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'No se pudo leer la pieza.');
  } finally {
    event.target.value = '';
  }
}

function setCustomPiece(piece) {
  state.selectedPieceId = 'custom';
  const customOption = Array.from(els.pieceSelect.options).find((option) => option.value === 'custom') || document.createElement('option');
  customOption.value = 'custom';
  customOption.textContent = piece.title;
  if (!customOption.parentElement) els.pieceSelect.appendChild(customOption);
  els.pieceSelect.value = 'custom';
  setPiece(piece);
  updateAllUI();
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
    state.analyser.fftSize = AUDIO_CONFIG.FFT_SIZE;
    state.analyser.smoothingTimeConstant = AUDIO_CONFIG.SMOOTHING_TIME_CONSTANT;
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
  await requestScreenWakeLock();
  state.calibration.step = 0;
  state.calibration.readings = [];
  state.calibration.awaitingRelease = false;
  state.calibration.completed = false;
  state.rawDetectedMidi = null;
  state.detectedMidi = null;
  state.stableMidi = null;
  state.stableCount = 0;
  state.onsetActive = false;
  state.belowSilenceEnterSince = null;
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
  state.onsetActive = false;
  state.belowSilenceEnterSince = null;
  els.calibrationPanel.hidden = true;
  els.calibrateButton.disabled = false;
  updateCalibrationButton();
  updateKeyboardHighlights();
  releaseScreenWakeLock();
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
  releaseScreenWakeLock();
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
  releaseScreenWakeLock();
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
  if (state.mode === 'continuous' && !state.micReady) {
    showToast('Activa el micrófono antes de iniciar: el modo continuo espera a que toques la primera nota.');
    return;
  }
  prepareSession('practice');
  state.playing = true;
  await requestScreenWakeLock();
  await enterLandscapeMode();
  if (!state.micReady) showToast('Activa el micrófono para validar las notas.');
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
  await requestScreenWakeLock();
  await enterLandscapeMode();
  triggerPreviewNotes(state.currentSeconds - 0.01, state.currentSeconds + 0.01);
  startLoop();
  updateAllUI();
  showToast('Previsualización: escucha la pieza y sigue las teclas iluminadas.');
}

function prepareSession(kind) {
  stopSynthVoices();
  state.sessionKind = kind;
  state.playing = false;
  state.continuousStarted = kind !== 'practice' || state.mode !== 'continuous';
  state.currentSeconds = getSegmentStartSeconds();
  state.currentIndex = getFirstActiveNoteIndex();
  state.lastFrameAt = performance.now();
  state.lastAcceptedAt = 0;
  state.previewPlayedIndexes = new Set();
  state.noteResults = buildNoteResults();
  state.wrongAttempts = 0;
  state.stableMidi = null;
  state.stableCount = 0;
  document.body.classList.add('session-active');
  requestAnimationFrame(() => {
    resizeCanvas();
    renderKeyboard();
  });
}

function restartSession() {
  if (!state.sessionKind) return;
  const kind = state.sessionKind;
  prepareSession(kind);
  state.playing = true;
  state.lastFrameAt = performance.now();
  if (kind === 'preview') {
    triggerPreviewNotes(state.currentSeconds - 0.01, state.currentSeconds + 0.01);
  }
  startLoop();
  updateAllUI();
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
  state.continuousStarted = false;
  stopSynthVoices();
  if (wasPractice && state.mode === 'continuous') evaluateMissedNotes();
  state.sessionKind = null;
  releaseScreenWakeLock();
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
  state.continuousStarted = false;
  state.sessionKind = null;
  state.currentSeconds = getSegmentStartSeconds();
  state.currentIndex = getFirstActiveNoteIndex();
  state.lastFrameAt = performance.now();
  state.lastAcceptedAt = 0;
  state.previewPlayedIndexes = new Set();
  state.noteResults = state.piece ? buildNoteResults() : [];
  state.wrongAttempts = 0;
  state.detectedMidi = null;
  state.detectedFrequency = null;
  state.detectedConfidence = 0;
  stopSynthVoices();
  releaseScreenWakeLock();
  document.body.classList.remove('session-active');
  updateAllUI();
  drawScore();
}

async function requestScreenWakeLock() {
  if (!('wakeLock' in navigator)) return false;
  if (document.visibilityState !== 'visible') return false;
  if (!state.sessionKind && !state.calibration.active) return false;
  if (state.wakeLock) return true;
  if (state.wakeLockRequest) return state.wakeLockRequest;

  state.wakeLockRequest = navigator.wakeLock.request('screen')
    .then(async (wakeLock) => {
      if (!state.sessionKind && !state.calibration.active) {
        try { await wakeLock.release(); } catch (_) { /* ya liberado */ }
        return false;
      }

      state.wakeLock = wakeLock;
      wakeLock.addEventListener('release', () => {
        if (state.wakeLock === wakeLock) state.wakeLock = null;
      }, { once: true });
      return true;
    })
    .catch(() => false)
    .finally(() => {
      state.wakeLockRequest = null;
    });

  return state.wakeLockRequest;
}

async function releaseScreenWakeLock() {
  const wakeLock = state.wakeLock;
  state.wakeLock = null;
  if (!wakeLock) return;
  try {
    await wakeLock.release();
  } catch (_) {
    // Puede haberse liberado automáticamente al ocultar la página.
  }
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
    if (state.micReady && state.sessionKind !== 'preview' && timestamp - state.lastAnalysisAt > AUDIO_CONFIG.ANALYSIS_INTERVAL_MS) {
      state.lastAnalysisAt = timestamp;
      analyzeMicrophone(timestamp);
    }
    if (timestamp - state.lastDrawAt > AUDIO_CONFIG.DRAW_INTERVAL_MS) {
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
    if (!state.continuousStarted) {
      state.currentIndex = 0;
      updateDynamicUI();
      return;
    }
    state.currentSeconds += delta;
    evaluateMissedNotes();
    state.currentIndex = getExpectedIndex();
    if (state.currentSeconds >= getPieceDurationSeconds()) finishSession();
  } else {
    const note = state.piece.practiceNotes[state.currentIndex];
    if (!note) finishSession();
    else state.currentSeconds = beatToSeconds(note.startBeat);
  }
  updateDynamicUI();
}

function triggerPreviewNotes(previousSeconds, currentSeconds) {
  if (!state.piece || state.sessionKind !== 'preview') return;
  state.piece.allNotes.forEach((note, index) => {
    if (state.previewPlayedIndexes.has(index)) return;
    if (!isWithinActiveSegment(note.startBeat)) return;
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
  filter.frequency.setValueAtTime(Math.min(2600, frequency * 4), now);
  filter.Q.value = 0.2;
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.09, now + 0.14);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.32);
  filter.connect(master);
  master.connect(context.destination);

  const harmonics = [
    { ratio: 1, type: 'sine', detune: 0, gain: 0.75 },
    { ratio: 1, type: 'triangle', detune: 4, gain: 0.28 },
    { ratio: 2, type: 'sine', detune: -3, gain: 0.09 }
  ];

  harmonics.forEach((harmonic) => {
    const oscillator = context.createOscillator();
    const harmonicGain = context.createGain();
    oscillator.type = harmonic.type;
    oscillator.frequency.setValueAtTime(frequency * harmonic.ratio, now);
    oscillator.detune.setValueAtTime(harmonic.detune, now);
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

  state.previousSmoothedRms = state.smoothedRms;
  state.smoothedRms += ONSET_CONFIG.RMS_SMOOTHING_ALPHA * (rms - state.smoothedRms);
  const rmsDelta = state.smoothedRms - state.previousSmoothedRms;
  const isOnsetEdge = rmsDelta > ONSET_CONFIG.RMS_ONSET_DELTA && state.smoothedRms > ONSET_CONFIG.RMS_SUSTAIN_GATE;

  if (isOnsetEdge) {
    // Un ataque nuevo interrumpe la resonancia de la nota anterior: se reinicia el
    // contador de estabilidad para que la nota nueva construya su propia racha.
    state.onsetActive = true;
    state.onsetDetectedAt = timestamp;
    state.stableMidi = null;
    state.stableCount = 0;
  }

  if (state.smoothedRms < ONSET_CONFIG.RMS_SILENCE_ENTER) {
    if (state.belowSilenceEnterSince === null) state.belowSilenceEnterSince = timestamp;
    if (timestamp - state.belowSilenceEnterSince >= ONSET_CONFIG.RMS_SILENCE_HOLD_MS) {
      state.detectedMidi = null;
      state.rawDetectedMidi = null;
      state.detectedFrequency = null;
      state.detectedConfidence = 0;
      state.stableMidi = null;
      state.stableCount = 0;
      state.onsetActive = false;
      if (state.calibration.active && state.calibration.awaitingRelease) {
        state.calibration.awaitingRelease = false;
        updateCalibrationUI();
        updateKeyboardHighlights();
      }
      updateDynamicUI();
      return;
    }
    // Todavía por debajo del umbral de entrada en silencio, pero sin cumplir el
    // tiempo de sostenimiento: se trata como resonancia en decaimiento, no silencio.
  } else {
    state.belowSilenceEnterSince = null;
  }

  // Mientras el sonido está en la banda de resonancia (por debajo del umbral de
  // sostenimiento) y no acaba de producirse un ataque, se evita el análisis YIN.
  if (state.smoothedRms < ONSET_CONFIG.RMS_SUSTAIN_GATE && !isOnsetEdge) {
    updateDynamicUI();
    return;
  }

  const result = yinPitch(state.audioBuffer, state.audioContext.sampleRate, PITCH_CONFIG.YIN_THRESHOLD);
  if (!result || result.frequency < PITCH_CONFIG.MIN_FREQUENCY_HZ || result.frequency > PITCH_CONFIG.MAX_FREQUENCY_HZ) return;

  const rawMidi = Math.round(frequencyToMidi(result.frequency));
  if (rawMidi < PITCH_CONFIG.MIDI_MIN || rawMidi > PITCH_CONFIG.MIDI_MAX) return;
  const adjustedMidi = rawMidi + state.pitchOffset;

  state.rawDetectedMidi = rawMidi;
  state.detectedMidi = adjustedMidi >= PITCH_CONFIG.MIDI_MIN && adjustedMidi <= PITCH_CONFIG.MIDI_MAX ? adjustedMidi : null;
  state.detectedFrequency = result.frequency;
  state.detectedConfidence = result.confidence;

  if (state.stableMidi === rawMidi) state.stableCount += 1;
  else {
    state.stableMidi = rawMidi;
    state.stableCount = 1;
  }

  if (state.calibration.active) updateCalibrationUI();

  const onsetWindowOpen = state.onsetActive && (timestamp - state.onsetDetectedAt < ONSET_CONFIG.ONSET_ACTIVE_WINDOW_MS);
  const requiredStableFrames = onsetWindowOpen
    ? ONSET_CONFIG.STABLE_FRAMES_REQUIRED_ON_ONSET
    : ONSET_CONFIG.STABLE_FRAMES_REQUIRED;

  if (state.stableCount >= requiredStableFrames
      && result.confidence >= ONSET_CONFIG.CONFIDENCE_ACCEPT_THRESHOLD
      && timestamp - state.lastAcceptedAt > ONSET_CONFIG.ACCEPT_DEBOUNCE_MS) {
    if (state.calibration.active) captureCalibrationNote(rawMidi, timestamp);
    else if (state.detectedMidi !== null) acceptDetectedNote(state.detectedMidi, timestamp);
    state.onsetActive = false; // vía rápida consumida
  }
  updateDynamicUI();
}

function acceptDetectedNote(midi, timestamp) {
  if (!state.playing || state.sessionKind !== 'practice' || !state.piece) return;
  const expectedIndex = state.mode === 'wait' ? state.currentIndex : getExpectedIndex();
  const expected = state.piece.practiceNotes[expectedIndex];
  if (!expected) return;

  if (midi === expected.midi) {
    if (state.noteResults[expectedIndex] !== 'correct') state.noteResults[expectedIndex] = 'correct';
    state.lastAcceptedAt = timestamp;
    flashKey(expected.midi, 'detected');

    if (state.mode === 'continuous' && !state.continuousStarted && expectedIndex === 0) {
      state.continuousStarted = true;
      state.currentSeconds = beatToSeconds(expected.startBeat);
      state.lastFrameAt = performance.now();
      showToast('Primera nota detectada. Comienza la práctica.');
    }

    if (state.mode === 'wait') {
      state.currentIndex += 1;
      const next = state.piece.practiceNotes[state.currentIndex];
      const nextIsActive = next && state.noteResults[state.currentIndex] !== 'excluded';
      if (nextIsActive) state.currentSeconds = beatToSeconds(next.startBeat);
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
  state.piece.practiceNotes.forEach((note, index) => {
    const noteEnd = beatToSeconds(note.startBeat + note.durationBeats);
    if (state.currentSeconds > noteEnd + graceSeconds && state.noteResults[index] === 'pending') {
      state.noteResults[index] = 'missed';
    }
  });
}

function getExpectedIndex() {
  if (!state.piece) return 0;
  let lastActive = 0;
  for (let index = 0; index < state.piece.practiceNotes.length; index += 1) {
    const result = state.noteResults[index];
    if (result === 'excluded') continue;
    lastActive = index;
    if (result === 'correct' || result === 'missed') continue;
    const note = state.piece.practiceNotes[index];
    const noteEnd = beatToSeconds(note.startBeat + note.durationBeats) + 0.45;
    if (state.currentSeconds <= noteEnd) return index;
  }
  return lastActive;
}

function getTemporalNoteIndex() {
  if (!state.piece) return 0;
  const beat = secondsToBeat(state.currentSeconds);
  let current = 0;
  for (let index = 0; index < state.piece.practiceNotes.length; index += 1) {
    if (state.piece.practiceNotes[index].startBeat <= beat + 0.02) current = index;
    else break;
  }
  return current;
}

function finishSession() {
  const completedKind = state.sessionKind;
  state.playing = false;
  state.continuousStarted = false;
  stopSynthVoices();
  if (completedKind === 'practice' && state.mode === 'continuous') evaluateMissedNotes();
  state.sessionKind = null;
  releaseScreenWakeLock();
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
  els.noteNamesToggle.checked = state.showNoteNames;
  els.simpleStaffToggle.checked = state.simpleStaffMode;
  els.segmentSelect.value = state.selectedSegmentId;
  if (BUILT_IN_PIECES[state.selectedPieceId]) els.pieceSelect.value = state.selectedPieceId;
  updateCalibrationButton();
  updateTransportUI();
  updateDynamicUI();
  updateProgressUI();
}

function updateTransportUI() {
  let status = 'Preparado';
  if (state.sessionKind === 'preview') status = state.playing ? 'Previsualizando' : 'Previsualización pausada';
  else if (state.sessionKind === 'practice' && state.playing && state.mode === 'continuous' && !state.continuousStarted) status = 'Esperando primera nota';
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
  const expected = state.piece.practiceNotes[expectedIndex];
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
  const total = state.piece.practiceNotes.length;
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
  const completed = state.noteResults.filter((value) => value !== 'pending' && value !== 'excluded').length;
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
    const note = state.piece.practiceNotes[getTemporalNoteIndex()];
    midi = note?.midi ?? null;
    className = 'preview-current';
  } else if (state.showHints) {
    const note = state.mode === 'wait' ? state.piece.practiceNotes[state.currentIndex] : state.piece.practiceNotes[getExpectedIndex()];
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

function bindScoreDragEvents() {
  const canvas = els.scoreCanvas;
  canvas.addEventListener('pointerdown', onScorePointerDown);
  canvas.addEventListener('pointermove', onScorePointerMove);
  canvas.addEventListener('pointerup', onScorePointerEnd);
  canvas.addEventListener('pointercancel', onScorePointerEnd);
}

function onScorePointerDown(event) {
  if (!state.piece || !state.sessionKind) return;
  state.isDraggingScore = true;
  state.dragStartClientX = event.clientX;
  state.dragStartBeat = secondsToBeat(state.currentSeconds);
  if (state.playing) {
    state.playing = false;
    stopSynthVoices();
    updateTransportUI();
  }
  try { els.scoreCanvas.setPointerCapture(event.pointerId); } catch (_) { /* no soportado en todos los navegadores */ }
}

function onScorePointerMove(event) {
  if (!state.isDraggingScore) return;
  const deltaX = event.clientX - state.dragStartClientX;
  const pixelsPerBeat = state.lastPixelsPerBeat || 60;
  seekToBeat(state.dragStartBeat - deltaX / pixelsPerBeat);
  drawScore();
  updateDynamicUI();
  updateProgressUI();
}

function onScorePointerEnd(event) {
  if (!state.isDraggingScore) return;
  state.isDraggingScore = false;
  try { els.scoreCanvas.releasePointerCapture(event.pointerId); } catch (_) { /* no soportado en todos los navegadores */ }
  state.lastFrameAt = performance.now();
  updateTransportUI();
}

// Reposiciona la reproducción a un pulso concreto (arrastrar la partitura hacia
// atrás/adelante). Las notas a partir de ese punto vuelven a 'pending' para poder
// repetirlas, y en modo preview se liberan del registro de "ya sonadas".
function seekToBeat(beat) {
  if (!state.piece) return;
  const minBeat = state.segment ? state.segment.startBeat : 0;
  const maxBeat = state.segment ? state.segment.endBeat : secondsToBeat(getPieceDurationSeconds());
  const clampedBeat = clamp(beat, minBeat, maxBeat);
  state.currentSeconds = beatToSeconds(clampedBeat);

  if (state.sessionKind === 'practice') {
    state.piece.practiceNotes.forEach((note, index) => {
      if (state.noteResults[index] === 'excluded') return;
      if (note.startBeat >= clampedBeat - 0.001) state.noteResults[index] = 'pending';
    });
    if (state.mode === 'wait') {
      const notes = state.piece.practiceNotes;
      let nextIndex = notes.length - 1;
      for (let index = 0; index < notes.length; index += 1) {
        if (state.noteResults[index] === 'excluded') continue;
        if (notes[index].startBeat >= clampedBeat - 0.001) { nextIndex = index; break; }
      }
      state.currentIndex = nextIndex;
    }
  } else if (state.sessionKind === 'preview') {
    Array.from(state.previewPlayedIndexes).forEach((index) => {
      const note = state.piece.allNotes[index];
      if (note && note.startBeat >= clampedBeat - 0.001) state.previewPlayedIndexes.delete(index);
    });
  }
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

  const stavesToRender = state.simpleStaffMode ? state.piece.staves.slice(0, 1) : state.piece.staves;
  const lineGap = Math.min(22, height * 0.09);
  const staffSpacing = lineGap * 4 + lineGap * 3.2;
  const staffTops = stavesToRender.map((_, index) => height * 0.29 + index * staffSpacing);
  const topStaffTop = staffTops[0];
  const overallBottomLineY = staffTops[staffTops.length - 1] + lineGap * 4;
  const playheadX = Math.min(width * 0.23, 210);
  // Una escala más compacta permite anticipar aproximadamente 15 pulsos en pantalla.
  const pixelsPerBeat = Math.max(36, width / 15.5);
  state.lastPixelsPerBeat = pixelsPerBeat;
  const currentBeat = secondsToBeat(state.currentSeconds);

  context.strokeStyle = '#3d4651';
  context.lineWidth = 1;
  staffTops.forEach((staffTop) => {
    for (let line = 0; line < 5; line += 1) {
      const y = staffTop + line * lineGap;
      context.beginPath();
      context.moveTo(18, y);
      context.lineTo(width - 18, y);
      context.stroke();
    }
  });

  stavesToRender.forEach((staff, staffIndex) => {
    drawKeySignature(context, staffTops[staffIndex], lineGap, 34, state.piece.keySignature, staff.clef);
  });

  context.strokeStyle = '#6685ff';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(playheadX, topStaffTop - 44);
  context.lineTo(playheadX, overallBottomLineY + 44);
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
    context.moveTo(x, topStaffTop - 8);
    context.lineTo(x, overallBottomLineY + 8);
    context.stroke();
    context.fillText(String(beat / beatsPerMeasure + 1), x, topStaffTop - 18);
  }

  const activeIndex = state.sessionKind === 'preview' ? getTemporalNoteIndex() : (state.mode === 'wait' ? state.currentIndex : getExpectedIndex());

  stavesToRender.forEach((staff, staffIndex) => {
    const staffTop = staffTops[staffIndex];
    const bottomLineY = staffTop + lineGap * 4;
    const singleVoice = staff.voices.length <= 1;
    const referenceMidi = staff.clef === 'bass' ? 50 : 71;

    staff.voices.forEach((voice, voiceIndex) => {
      voice.notes.forEach((note) => {
        const x = playheadX + (note.startBeat - currentBeat) * pixelsPerBeat;
        if (x < -35 || x > width + 35) return;
        const y = midiToStaffY(note.midi, staffTop, lineGap, staff.clef);
        const status = note.practiceIndex !== undefined ? state.noteResults[note.practiceIndex] : undefined;
        const isCurrent = note.practiceIndex === activeIndex;

        let noteColor = '#232a33';
        if (status === 'excluded') noteColor = '#c3c9d1';
        else if (state.sessionKind !== 'preview' && status === 'correct') noteColor = '#20a877';
        else if (state.sessionKind !== 'preview' && (status === 'wrong' || status === 'missed')) noteColor = '#e7485b';
        else if (isCurrent) noteColor = '#526ff3';

        // Líneas adicionales para notas que caen fuera del pentagrama.
        context.strokeStyle = noteColor;
        context.lineWidth = 1;
        if (y < staffTop - lineGap / 2) {
          for (let ly = staffTop - lineGap; ly >= y - lineGap / 2; ly -= lineGap) {
            context.beginPath();
            context.moveTo(x - 12, ly);
            context.lineTo(x + 12, ly);
            context.stroke();
          }
        } else if (y > bottomLineY + lineGap / 2) {
          for (let ly = bottomLineY + lineGap; ly <= y + lineGap / 2; ly += lineGap) {
            context.beginPath();
            context.moveTo(x - 12, ly);
            context.lineTo(x + 12, ly);
            context.stroke();
          }
        }

        const glyph = getDurationGlyphFromType(note.noteType, note.dots);
        // Con una sola voz, la plica sigue la altura de la nota; con dos voces por
        // pentagrama, la voz 1 va siempre hacia arriba y la voz 2 hacia abajo.
        const stemUp = singleVoice ? note.midi < referenceMidi : voiceIndex === 0;

        context.save();
        context.translate(x, y);
        context.rotate(glyph.wide ? -0.08 : -0.22);
        context.beginPath();
        context.ellipse(0, 0, glyph.wide ? 10 : 7, 5, 0, 0, Math.PI * 2);
        if (glyph.hollow) {
          context.fillStyle = '#f7f4ec';
          context.fill();
          context.lineWidth = 1.6;
          context.strokeStyle = noteColor;
          context.stroke();
        } else {
          context.fillStyle = noteColor;
          context.fill();
        }
        context.restore();

        if (glyph.dot) {
          context.beginPath();
          context.fillStyle = noteColor;
          context.arc(x + 14, y - 2, 1.8, 0, Math.PI * 2);
          context.fill();
        }

        if (glyph.stem && note.chordWith === null) {
          const stemLength = 32;
          const stemX = stemUp ? x + 7 : x - 7;
          const stemDir = stemUp ? -1 : 1;
          const stemEndY = y + stemDir * stemLength;

          context.strokeStyle = noteColor;
          context.lineWidth = 1.6;
          context.beginPath();
          context.moveTo(stemX, y);
          context.lineTo(stemX, stemEndY);
          context.stroke();

          for (let f = 0; f < glyph.flags; f += 1) {
            const flagStartY = stemEndY + stemDir * (f * 8);
            context.beginPath();
            context.moveTo(stemX, flagStartY);
            context.quadraticCurveTo(
              stemX + (stemUp ? 9 : -9),
              flagStartY + stemDir * 6,
              stemX,
              flagStartY + stemDir * 14
            );
            context.stroke();
          }
        }

        if (note.articulations && note.articulations.length) {
          if (note.articulations.includes('staccato')) {
            context.beginPath();
            context.fillStyle = noteColor;
            context.arc(x, y + (stemUp ? 12 : -12), 1.8, 0, Math.PI * 2);
            context.fill();
          }
          if (note.articulations.includes('accent')) {
            const accentX = x - 14;
            context.strokeStyle = noteColor;
            context.lineWidth = 1.4;
            context.beginPath();
            context.moveTo(accentX - 4, y - 4);
            context.lineTo(accentX + 3, y);
            context.lineTo(accentX - 4, y + 4);
            context.stroke();
          }
        }

        if (state.showNoteNames && note.chordWith === null) {
          context.fillStyle = noteColor;
          context.font = '600 9px system-ui';
          context.textAlign = 'center';
          context.fillText(NOTE_NAMES[((note.midi % 12) + 12) % 12], x, y + 20);
        }
      });
    });
  });

  if (Array.isArray(state.piece.dynamics) && state.piece.dynamics.length) {
    context.font = 'italic 700 13px Georgia, serif';
    context.fillStyle = '#3d4651';
    context.textAlign = 'center';
    state.piece.dynamics.forEach((mark) => {
      const x = playheadX + (mark.beat - currentBeat) * pixelsPerBeat;
      if (x < -35 || x > width + 35) return;
      context.fillText(mark.text, x, overallBottomLineY + 26);
    });
  }

  context.fillStyle = '#27303a';
  context.font = '700 14px system-ui';
  context.textAlign = 'left';
  context.fillText('Clave de sol · representación simplificada', 18, 24);
}

const KEY_SIGNATURE_ACCIDENTAL_MIDIS = {
  treble: { sharps: [77, 72, 79, 74, 69, 76, 71], flats: [71, 76, 69, 74, 67, 72, 65] },
  bass: { sharps: [65, 60, 67, 62, 57, 64, 59], flats: [59, 64, 57, 62, 55, 60, 53] }
};

function drawKeySignature(context, staffTop, lineGap, x, keySignature, clef) {
  const fifths = keySignature ? Math.round(Number(keySignature.fifths) || 0) : 0;
  if (!fifths) return;

  const table = KEY_SIGNATURE_ACCIDENTAL_MIDIS[clef] || KEY_SIGNATURE_ACCIDENTAL_MIDIS.treble;
  const midis = fifths > 0 ? table.sharps : table.flats;
  const glyph = fifths > 0 ? '♯' : '♭';
  const count = Math.min(Math.abs(fifths), midis.length);

  context.save();
  context.fillStyle = '#232a33';
  context.font = '600 16px system-ui';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (let index = 0; index < count; index += 1) {
    const y = midiToStaffY(midis[index], staffTop, lineGap, clef);
    context.fillText(glyph, x + index * 9, y);
  }
  context.restore();
}

function getDurationGlyphFromType(noteType, dots) {
  const table = {
    whole: { wide: true, hollow: true, stem: false, flags: 0 },
    half: { wide: false, hollow: true, stem: true, flags: 0 },
    quarter: { wide: false, hollow: false, stem: true, flags: 0 },
    eighth: { wide: false, hollow: false, stem: true, flags: 1 },
    '16th': { wide: false, hollow: false, stem: true, flags: 2 },
    '32nd': { wide: false, hollow: false, stem: true, flags: 3 }
  };
  const base = table[noteType] || table.quarter;
  return { ...base, dot: Number(dots) > 0 };
}

function midiToStaffY(midi, staffTop, lineGap, clef = 'treble') {
  const referenceMidi = clef === 'bass' ? 50 : 71;
  const semitoneOffset = midi - referenceMidi;
  return staffTop + lineGap * 2 - semitoneOffset * (lineGap / 4);
}

function yinPitch(buffer, sampleRate, threshold) {
  const minTau = Math.max(2, Math.floor(sampleRate / PITCH_CONFIG.MAX_FREQUENCY_HZ));
  const maxTau = Math.min(Math.floor(sampleRate / PITCH_CONFIG.MIN_FREQUENCY_HZ), buffer.length - 2);
  const comparisonLength = Math.min(PITCH_CONFIG.YIN_WINDOW_CAP, buffer.length - maxTau);
  if (comparisonLength < PITCH_CONFIG.YIN_MIN_COMPARISON_LENGTH) return null;

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
  if (state.segment) return beatToSeconds(state.segment.endBeat);
  const lastEndBeat = state.piece.allNotes.reduce((max, note) => Math.max(max, note.startBeat + note.durationBeats), 0);
  return beatToSeconds(lastEndBeat);
}

function saveSettings() {
  localStorage.setItem('pianoCoachSettings', JSON.stringify({
    mode: state.mode,
    keyboardSize: state.keyboardSize,
    showHints: state.showHints,
    showNoteNames: state.showNoteNames,
    simpleStaffMode: state.simpleStaffMode,
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
    if (typeof saved.showNoteNames === 'boolean') state.showNoteNames = saved.showNoteNames;
    if (typeof saved.simpleStaffMode === 'boolean') state.simpleStaffMode = saved.simpleStaffMode;
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
  positionSessionToast(document.querySelector('.toast'));
  window.setTimeout(() => toast.remove(), 4300);
}

// Durante una sesión, el teclado y la partitura ocupan toda la pantalla: el aviso se
// coloca justo debajo de la barra de transporte (nunca sobre el teclado ni la
// partitura), calculado en píxeles reales para que funcione en cualquier tamaño de
// pantalla sin duplicar puntos de ruptura en el CSS.
function positionSessionToast(toast) {
  if (!toast || !document.body.classList.contains('session-active')) return;
  const stageBar = document.querySelector('.stage-bar');
  if (!stageBar || !els.scoreCanvas) return;
  const barRect = stageBar.getBoundingClientRect();
  const canvasRect = els.scoreCanvas.getBoundingClientRect();
  // Se ancla al borde superior de la barra de transporte (no a su borde inferior):
  // así el aviso dispone de todo el hueco hasta la partitura como presupuesto de
  // altura, en vez de depender del margen entre la barra y la partitura, que puede
  // ser más estrecho que el propio relleno/borde del aviso en pantallas muy bajas.
  const availableHeight = Math.max(0, canvasRect.top - barRect.top - 2);
  toast.classList.add('toast-compact');
  toast.style.top = `${Math.round(barRect.top)}px`;
  toast.style.maxHeight = `${Math.round(availableHeight)}px`;
  toast.style.overflow = 'hidden';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
