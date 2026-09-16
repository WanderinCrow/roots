'use strict';

// ── Music Data ────────────────────────────────────────────────────────────────

const NOTES      = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_FLATS = ['',  'Db', '',  'Eb',  '',  '',  'Gb', '',  'Ab', '',  'Bb',  ''];

const SCALES = {
  'Major':       { intervals: [0,2,4,5,7,9,11],  degrees: ['1','2','3','4','5','6','7'] },
  'Minor':       { intervals: [0,2,3,5,7,8,10],  degrees: ['1','2','b3','4','5','b6','b7'] },
  'Harm. Minor': { intervals: [0,2,3,5,7,8,11],  degrees: ['1','2','b3','4','5','b6','7'] },
  'Mel. Minor':  { intervals: [0,2,3,5,7,9,11],  degrees: ['1','2','b3','4','5','6','7'] },
  'Major Penta': { intervals: [0,2,4,7,9],        degrees: ['1','2','3','5','6'] },
  'Minor Penta': { intervals: [0,3,5,7,10],       degrees: ['1','b3','4','5','b7'] },
  'Blues':       { intervals: [0,3,5,6,7,10],     degrees: ['1','b3','4','b5','5','b7'] },
  'Dorian':      { intervals: [0,2,3,5,7,9,10],  degrees: ['1','2','b3','4','5','6','b7'] },
  'Phrygian':    { intervals: [0,1,3,5,7,8,10],  degrees: ['1','b2','b3','4','5','b6','b7'] },
  'Lydian':      { intervals: [0,2,4,6,7,9,11],  degrees: ['1','2','3','#4','5','6','7'] },
  'Mixolydian':  { intervals: [0,2,4,5,7,9,10],  degrees: ['1','2','3','4','5','6','b7'] },
  'Locrian':     { intervals: [0,1,3,5,6,8,10],  degrees: ['1','b2','b3','4','b5','b6','b7'] },
};

const CHORDS = {
  'Major':      { intervals: [0,4,7],         degrees: ['1','3','5'] },
  'Minor':      { intervals: [0,3,7],         degrees: ['1','b3','5'] },
  'Dom 7':      { intervals: [0,4,7,10],      degrees: ['1','3','5','b7'] },
  'Maj 7':      { intervals: [0,4,7,11],      degrees: ['1','3','5','7'] },
  'Min 7':      { intervals: [0,3,7,10],      degrees: ['1','b3','5','b7'] },
  'Min Maj 7':  { intervals: [0,3,7,11],      degrees: ['1','b3','5','7'] },
  'Dom 9':      { intervals: [0,2,4,7,10],    degrees: ['1','9','3','5','b7'] },
  'Maj 9':      { intervals: [0,2,4,7,11],    degrees: ['1','9','3','5','7'] },
  'Min 9':      { intervals: [0,2,3,7,10],    degrees: ['1','9','b3','5','b7'] },
  'Maj 6':      { intervals: [0,4,7,9],       degrees: ['1','3','5','6'] },
  'Min 6':      { intervals: [0,3,7,9],       degrees: ['1','b3','5','6'] },
  'Aug':        { intervals: [0,4,8],         degrees: ['1','3','#5'] },
  'Dim':        { intervals: [0,3,6],         degrees: ['1','b3','b5'] },
  'Dim 7':      { intervals: [0,3,6,9],       degrees: ['1','b3','b5','bb7'] },
  'Half Dim':   { intervals: [0,3,6,10],      degrees: ['1','b3','b5','b7'] },
  'Sus 2':      { intervals: [0,2,7],         degrees: ['1','2','5'] },
  'Sus 4':      { intervals: [0,5,7],         degrees: ['1','4','5'] },
  'Power':      { intervals: [0,7],           degrees: ['1','5'] },
};

// ── Tunings ────────────────────────────────────────────────────────────────────
// Open string semitone values (0=C) for each tuning, str6 (low) → str1 (high).

const TUNINGS = {
  'Standard':  [4,  9,  2,  7,  11, 4],   // E  A  D  G  B  e
  'Drop D':    [2,  9,  2,  7,  11, 4],   // D  A  D  G  B  e
  'Open G':    [2,  7,  2,  7,  11, 2],   // D  G  D  G  B  D
  'Open D':    [2,  9,  2,  6,  9,  2],   // D  A  D  F# A  D
  'Open E':    [4,  11, 4,  8,  11, 4],   // E  B  E  G# B  e
  'DADGAD':    [2,  9,  2,  7,  9,  2],   // D  A  D  G  A  D
  'Half Down': [3,  8,  1,  6,  10, 3],   // Eb Ab Db Gb Bb Eb
  'Full Down': [2,  7,  0,  5,  9,  2],   // D  G  C  F  A  D
  'Drop C':    [0,  7,  0,  5,  9,  2],   // C  G  C  F  A  D
};

// ── Voicing algorithm ─────────────────────────────────────────────────────────
// For any tuning, scan a 4-fret window across the neck and find the best
// fingering for the given chord. Returns { frets, startFret, rootStringIdx, baseFret }.

function computeVoicing(tuning, rootNote, chordIntervals, skipBaseFrets = new Set()) {
  const chordSet = new Set(chordIntervals);

  // All valid fret positions per string that produce a chord tone
  const stringOpts = tuning.map(openNote => {
    const opts = [];
    for (let fret = 0; fret <= 15; fret++) {
      const interval = ((openNote + fret) % 12 - rootNote + 12) % 12;
      if (chordSet.has(interval)) opts.push({ fret, interval });
    }
    return opts;
  });

  let best = null, bestScore = Infinity;

  for (let base = 0; base <= 9; base++) {
    if (skipBaseFrets.has(base)) continue;
    // base=0 → allow open strings (fret 0) and frets 1–5
    // base>0 → only frets in [base, base+4]
    const lo = base, hi = base + 4;

    const voicing = stringOpts.map(opts => {
      const valid = opts.filter(o => o.fret >= lo && o.fret <= hi);
      if (!valid.length) return -1;
      // Score each option: strongly prefer low frets, small bonus for root
      valid.sort((a, b) =>
        (a.fret * 2 - (a.interval === 0 ? 3 : 0)) -
        (b.fret * 2 - (b.interval === 0 ? 3 : 0))
      );
      return valid[0].fret;
    });

    // Must include the root note somewhere
    const hasRoot = voicing.some((f, s) =>
      f >= 0 && ((tuning[s] + f) % 12 - rootNote + 12) % 12 === 0
    );
    if (!hasRoot) continue;

    const active  = voicing.filter(f => f > 0);
    const muted   = voicing.filter(f => f < 0).length;
    const span    = active.length > 1 ? Math.max(...active) - Math.min(...active) : 0;
    const score   = muted * 6 + span * 2 + base * 0.4;

    if (score < bestScore) {
      bestScore = score;
      const minActive = active.length ? Math.min(...active) : 0;
      best = {
        frets: voicing,
        startFret:    base === 0 ? 0 : minActive,
        baseFret:     base,
        rootStringIdx: voicing.findIndex((f, s) =>
          f >= 0 && ((tuning[s] + f) % 12 - rootNote + 12) % 12 === 0
        ),
      };
    }
  }

  return best;
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, text) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  if (text !== undefined) el.textContent = text;
  return el;
}

// ── Full fretboard ────────────────────────────────────────────────────────────

function buildFretboard(container, tuning, rootNote, chordIntervals, position) {
  const chordSet = new Set(chordIntervals);

  // Layout
  const FRET_COUNT = 12;
  const PL = 44, PR = 10, PT = 18, PB = 24;
  const STR_SPACING = 22;
  const FRET_W = 53;
  const W = PL + FRET_COUNT * FRET_W + PR;
  const H = PT + 5 * STR_SPACING + PB;

  // s=5 (high e) at top, s=0 (low E) at bottom
  const sy    = s => PT + (5 - s) * STR_SPACING;
  const dotX  = f => PL + (f - 0.5) * FRET_W;
  const fretX = f => PL + f * FRET_W;
  const openX = PL - 20;

  const winLo = position;
  const winHi = Math.min(position + 3, FRET_COUNT);

  const C_BG     = '#0f0f14';
  const C_FRET   = '#2a2a38';
  const C_STR    = '#3a3a50';
  const C_NUT    = '#888899';
  const C_DOT    = '#c084fc';
  const C_ROOT   = '#f0eeff';
  const C_DIM    = '#252535';
  const C_INLAY  = '#1e1e2c';
  const C_WIN_BG = 'rgba(192,132,252,0.06)';
  const C_WIN_BR = 'rgba(192,132,252,0.25)';
  const C_LABEL  = '#4a4a68';

  const svg = svgEl('svg', {
    width: '100%', height: '100%',
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: 'xMidYMid meet'
  });

  // Fretboard background
  svg.appendChild(svgEl('rect', {
    x: PL - 2, y: PT - 4,
    width: FRET_COUNT * FRET_W + 4, height: 5 * STR_SPACING + 8,
    fill: C_BG, rx: 4
  }));

  // Inlay markers
  const midY = PT + 2.5 * STR_SPACING;
  [3, 5, 7, 9].forEach(f => {
    svg.appendChild(svgEl('circle', { cx: dotX(f), cy: midY, r: 3.5, fill: C_INLAY }));
  });
  // Double dot at fret 12
  svg.appendChild(svgEl('circle', { cx: dotX(12), cy: midY - STR_SPACING, r: 3.5, fill: C_INLAY }));
  svg.appendChild(svgEl('circle', { cx: dotX(12), cy: midY + STR_SPACING, r: 3.5, fill: C_INLAY }));

  // Position window highlight
  const winRectX = position === 0 ? 0 : fretX(position - 1);
  const winRectW = position === 0 ? fretX(3) : FRET_W * 4;
  svg.appendChild(svgEl('rect', {
    x: winRectX, y: PT - 6,
    width: winRectW, height: 5 * STR_SPACING + 12,
    fill: C_WIN_BG, rx: 4,
    stroke: C_WIN_BR, 'stroke-width': 1
  }));

  // Fret lines
  for (let f = 1; f <= FRET_COUNT; f++) {
    svg.appendChild(svgEl('line', {
      x1: fretX(f), y1: PT,
      x2: fretX(f), y2: PT + 5 * STR_SPACING,
      stroke: C_FRET, 'stroke-width': 1
    }));
  }

  // Nut
  svg.appendChild(svgEl('line', {
    x1: PL, y1: PT,
    x2: PL, y2: PT + 5 * STR_SPACING,
    stroke: C_NUT, 'stroke-width': 4
  }));

  // String lines (thicker = lower string)
  const thicknesses = [2.2, 1.8, 1.5, 1.3, 1.1, 0.9];
  for (let s = 0; s < 6; s++) {
    svg.appendChild(svgEl('line', {
      x1: 0, y1: sy(s), x2: W, y2: sy(s),
      stroke: C_STR, 'stroke-width': thicknesses[s]
    }));
  }

  // String name labels — derived from tuning so they update with tuning changes
  for (let s = 0; s < 6; s++) {
    svg.appendChild(svgEl('text', {
      x: openX - 10, y: sy(s) + 4,
      'text-anchor': 'middle', 'font-size': 9,
      fill: C_LABEL, 'font-family': 'system-ui,sans-serif'
    }, NOTES[tuning[s]]));
  }

  // Fret number labels
  for (let f = 1; f <= FRET_COUNT; f++) {
    svg.appendChild(svgEl('text', {
      x: dotX(f), y: H - 6,
      'text-anchor': 'middle', 'font-size': 8,
      fill: C_LABEL, 'font-family': 'system-ui,sans-serif'
    }, String(f)));
  }

  // Chord tone dots — all positions, dimmed outside window
  for (let s = 0; s < 6; s++) {
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      const interval = ((tuning[s] + fret) % 12 - rootNote + 12) % 12;
      if (!chordSet.has(interval)) continue;

      const isRoot   = interval === 0;
      const inWin    = fret >= winLo && fret <= winHi;
      const cy       = sy(s);
      const noteName = NOTES[(tuning[s] + fret) % 12];

      if (fret === 0) {
        // Open string: hollow circle left of nut
        const stroke = inWin ? C_DOT : C_DIM;
        svg.appendChild(svgEl('circle', {
          cx: openX, cy, r: 8,
          fill: inWin ? 'rgba(192,132,252,0.15)' : 'none',
          stroke, 'stroke-width': isRoot && inWin ? 2.5 : 1.8
        }));
        svg.appendChild(svgEl('text', {
          x: openX, y: cy + 3.5,
          'text-anchor': 'middle',
          'font-size': noteName.length > 1 ? 5.5 : 7,
          'font-weight': isRoot && inWin ? '700' : '400',
          fill: inWin ? C_ROOT : '#3a3a58',
          'font-family': 'system-ui,sans-serif'
        }, noteName));
      } else {
        const cx = dotX(fret);
        svg.appendChild(svgEl('circle', { cx, cy, r: 8, fill: inWin ? C_DOT : C_DIM }));
        // Root: white ring outline
        if (isRoot && inWin) {
          svg.appendChild(svgEl('circle', {
            cx, cy, r: 8, fill: 'none',
            stroke: C_ROOT, 'stroke-width': 1.5
          }));
        }
        svg.appendChild(svgEl('text', {
          x: cx, y: cy + 3.5,
          'text-anchor': 'middle',
          'font-size': noteName.length > 1 ? 5.5 : 7,
          'font-weight': isRoot && inWin ? '700' : '400',
          fill: inWin ? C_ROOT : '#3a3a58',
          'font-family': 'system-ui,sans-serif'
        }, noteName));
      }
    }
  }

  container.innerHTML = '';
  container.appendChild(svg);
}

function getActiveTuning() {
  return currentTuning === 'Custom' ? customTuning : TUNINGS[currentTuning];
}

function renderFretboard() {
  buildFretboard(
    fretboardSvgEl,
    getActiveTuning(),
    rootIndex,
    CHORDS[currentChord].intervals,
    currentPosition
  );
  positionDisplayEl.textContent = currentPosition === 0 ? 'Open' : `Fret ${currentPosition}`;
}

// ── State ─────────────────────────────────────────────────────────────────────

let rootIndex     = 9;        // A
let currentScale  = 'Major';
let currentChord  = 'Major';
let currentTuning   = 'Standard';
let previousTuning  = 'Standard';
let customTuning    = [...TUNINGS['Standard']];
let currentPage     = 'scales';
let currentPosition = 0;

// ── DOM refs ──────────────────────────────────────────────────────────────────

const scaleGrid       = document.getElementById('scaleGrid');
const scaleDegreeRow  = document.getElementById('scaleDegreeRow');
const chordGrid       = document.getElementById('chordGrid');
const chordDegreeRow  = document.getElementById('chordDegreeRow');
const scaleTabs       = document.getElementById('scaleTabs');
const chordTabs       = document.getElementById('chordTabs');
const tuningSelectEl  = document.getElementById('tuningSelect');
const fretboardSvgEl    = document.getElementById('fretboardSvg');
const positionSliderEl  = document.getElementById('positionSlider');
const positionDisplayEl = document.getElementById('positionDisplay');

// ── Build DOM helpers ─────────────────────────────────────────────────────────

function buildNoteGrid(gridEl, degreeRowEl) {
  for (let i = 0; i < 12; i++) {
    const cell = document.createElement('div');
    cell.className = 'note-cell';

    const name   = document.createElement('span');
    name.className = 'note-name';

    const flat   = document.createElement('span');
    flat.className = 'note-flat';

    const degree = document.createElement('span');
    degree.className = 'note-degree';

    cell.append(name, flat, degree);
    cell.addEventListener('click', () => {
      rootIndex = (rootIndex + i) % 12;
      render();
    });
    gridEl.appendChild(cell);

    const deg = document.createElement('div');
    deg.className = 'degree-cell';
    degreeRowEl.appendChild(deg);
  }
}

function buildTabs(containerEl, data, getCurrent, setCurrent, renderFn) {
  Object.keys(data).forEach(name => {
    const tab = document.createElement('button');
    tab.className = 'scale-tab' + (name === getCurrent() ? ' active' : '');
    tab.textContent = name;
    tab.addEventListener('click', () => {
      setCurrent(name);
      containerEl.querySelectorAll('.scale-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderFn();
    });
    containerEl.appendChild(tab);
  });
}

// ── Render helpers ────────────────────────────────────────────────────────────

function renderGrid(gridEl, degreeRowEl, intervalSet, degreeByInterval) {
  const cells       = gridEl.querySelectorAll('.note-cell');
  const degreeCells = degreeRowEl.querySelectorAll('.degree-cell');

  cells.forEach((cell, i) => {
    const noteIdx = (rootIndex + i) % 12;
    const inScale = intervalSet.has(i);
    const isRoot  = i === 0;

    cell.querySelector('.note-name').textContent   = NOTES[noteIdx];
    cell.querySelector('.note-flat').textContent   = NOTE_FLATS[noteIdx];
    cell.querySelector('.note-degree').textContent = degreeByInterval[i] ?? '';

    cell.classList.toggle('active', inScale);
    cell.classList.toggle('root',   isRoot);

    const degBelow = degreeCells[i];
    degBelow.classList.toggle('active',      inScale);
    degBelow.classList.toggle('root-degree', isRoot);
    degBelow.textContent = degreeByInterval[i] ?? '';
  });
}

// ── Page renders ──────────────────────────────────────────────────────────────

function renderScales() {
  const scale = SCALES[currentScale];
  const intervalSet = new Set(scale.intervals);
  const degreeByInterval = {};
  scale.intervals.forEach((iv, i) => { degreeByInterval[iv] = scale.degrees[i]; });
  renderGrid(scaleGrid, scaleDegreeRow, intervalSet, degreeByInterval);
}

function renderChords() {
  const chord = CHORDS[currentChord];
  const intervalSet = new Set(chord.intervals);
  const degreeByInterval = {};
  chord.intervals.forEach((iv, i) => { degreeByInterval[iv] = chord.degrees[i]; });
  renderGrid(chordGrid, chordDegreeRow, intervalSet, degreeByInterval);
  renderFretboard();
}

function render() {
  if (currentPage === 'scales') renderScales();
  else renderChords();
}

// ── Page switching ────────────────────────────────────────────────────────────

document.querySelectorAll('.page-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentPage = btn.dataset.page;
    document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${currentPage}`).classList.remove('hidden');
    render();
  });
});

// ── Scroll over note grid ─────────────────────────────────────────────────────

let scrollAccum    = 0;
let lastScrollTime = 0;
const SCROLL_THRESHOLD = 35;
const SCROLL_COOLDOWN  = 80;

function handleGridWheel(e) {
  e.preventDefault();
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  scrollAccum += delta;
  const now = Date.now();
  if (Math.abs(scrollAccum) >= SCROLL_THRESHOLD && now - lastScrollTime >= SCROLL_COOLDOWN) {
    const dir = scrollAccum > 0 ? 1 : -1;
    scrollAccum = 0;
    lastScrollTime = now;
    rootIndex = (rootIndex + dir + 12) % 12;
    render();
  }
}

// ── Chord playback ────────────────────────────────────────────────────────────

function playChord() {
  const ctx = new AudioContext();
  const chord = CHORDS[currentChord];

  // C4 = 261.63 Hz; shift by rootIndex semitones
  const rootFreq = 261.63 * Math.pow(2, rootIndex / 12);

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 8;
  compressor.ratio.value = 4;
  compressor.connect(ctx.destination);

  // Bass root one octave down, then strum chord tones upward
  const voices = [
    { freq: rootFreq / 2, delay: 0 },
    ...chord.intervals.map((iv, i) => ({
      freq: rootFreq * Math.pow(2, iv / 12),
      delay: (i + 1) * 0.055,
    })),
  ];

  voices.forEach(({ freq, delay }) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
    osc.connect(gain);
    gain.connect(compressor);
    osc.start(t);
    osc.stop(t + 2.4);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

buildNoteGrid(scaleGrid, scaleDegreeRow);
buildNoteGrid(chordGrid, chordDegreeRow);

scaleGrid.addEventListener('wheel', handleGridWheel, { passive: false });
chordGrid.addEventListener('wheel', handleGridWheel, { passive: false });

document.getElementById('playChordBtn').addEventListener('click', playChord);

buildTabs(scaleTabs, SCALES,
  () => currentScale,
  v  => { currentScale = v; },
  renderScales
);

buildTabs(chordTabs, CHORDS,
  () => currentChord,
  v  => { currentChord = v; },
  renderChords
);

Object.keys(TUNINGS).forEach(name => {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  if (name === currentTuning) opt.selected = true;
  tuningSelectEl.appendChild(opt);
});
// Custom tuning option
const customOpt = document.createElement('option');
customOpt.value = 'Custom';
customOpt.textContent = 'Custom…';
tuningSelectEl.appendChild(customOpt);

tuningSelectEl.addEventListener('change', () => {
  if (tuningSelectEl.value === 'Custom') {
    previousTuning = currentTuning;
    openCustomTuningModal();
  } else {
    currentTuning = tuningSelectEl.value;
    renderChords();
  }
});

positionSliderEl.addEventListener('input', e => {
  currentPosition = parseInt(e.target.value, 10);
  renderFretboard();
});

// ── Custom tuning modal ────────────────────────────────────────────────────────

const customModal   = document.getElementById('customTuningModal');
const modalStrings  = document.getElementById('modalStrings');
const btnApply      = document.getElementById('btnCustomApply');
const btnCancel     = document.getElementById('btnCustomCancel');

const STRING_LABELS = ['6 · Low E', '5', '4', '3', '2', '1 · High e'];

function openCustomTuningModal() {
  // Populate selects with current customTuning values
  modalStrings.innerHTML = '';
  // Display high e (index 5) at top, low E (index 0) at bottom
  for (let i = 5; i >= 0; i--) {
    const row = document.createElement('div');
    row.className = 'modal-string-row';

    const lbl = document.createElement('span');
    lbl.className = 'modal-string-label';
    lbl.textContent = `String ${STRING_LABELS[i]}`;

    const sel = document.createElement('select');
    sel.className = 'tuning-select modal-note-select';
    sel.dataset.stringIndex = i;
    NOTES.forEach((note, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = note;
      if (idx === customTuning[i]) opt.selected = true;
      sel.appendChild(opt);
    });

    row.append(lbl, sel);
    modalStrings.appendChild(row);
  }
  customModal.classList.remove('hidden');
}

btnApply.addEventListener('click', () => {
  modalStrings.querySelectorAll('.modal-note-select').forEach(sel => {
    customTuning[parseInt(sel.dataset.stringIndex)] = parseInt(sel.value);
  });
  currentTuning = 'Custom';
  customModal.classList.add('hidden');
  renderChords();
});

function closeModal() {
  tuningSelectEl.value = previousTuning;
  currentTuning = previousTuning;
  customModal.classList.add('hidden');
}

btnCancel.addEventListener('click', closeModal);

customModal.addEventListener('click', e => {
  if (e.target === customModal) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !customModal.classList.contains('hidden')) closeModal();
});

render();
