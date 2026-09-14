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

// ── SVG chord diagram ─────────────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, text) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  if (text !== undefined) el.textContent = text;
  return el;
}

function buildDiagram(container, label, { frets, startFret, rootStringIdx }) {
  // Layout constants
  const SS = 22, FS = 26, PL = 30, PT = 40, PR = 20, PB = 12, FRET_ROWS = 5;
  const GW = SS * 5, GH = FS * FRET_ROWS;
  const W = GW + PL + PR, H = GH + PT + PB;
  const sx = i => PL + i * SS;
  const fy = f => PT + f * FS;

  // Colors
  const C_FRET = '#2a2a36', C_STR = '#38384a', C_NUT = '#9090aa';
  const C_DOT = '#c084fc', C_ROOT = '#f0eeff', C_MUTE = '#444458', C_OPEN = '#6a6a8a';

  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });

  // Nut or fret-position label
  if (startFret === 0) {
    svg.appendChild(svgEl('line', { x1: sx(0), y1: fy(0), x2: sx(5), y2: fy(0), stroke: C_NUT, 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
  } else {
    svg.appendChild(svgEl('text', { x: PL - 8, y: fy(1) - FS / 2 + 4, 'text-anchor': 'end', 'font-size': 10, fill: C_OPEN, 'font-family': 'system-ui,sans-serif' }, `${startFret}fr`));
  }

  // Fret lines
  for (let f = 0; f <= FRET_ROWS; f++) {
    if (!(startFret === 0 && f === 0)) {
      svg.appendChild(svgEl('line', { x1: sx(0), y1: fy(f), x2: sx(5), y2: fy(f), stroke: C_FRET, 'stroke-width': 1 }));
    }
  }

  // String lines
  for (let s = 0; s < 6; s++) {
    svg.appendChild(svgEl('line', { x1: sx(s), y1: fy(0), x2: sx(s), y2: fy(FRET_ROWS), stroke: C_STR, 'stroke-width': 1.5 }));
  }

  // Barre detection: lowest active fret appearing on 2+ strings (barre chords only)
  const activeFrets = frets.map((f, i) => ({ f, i })).filter(x => x.f > 0);
  const minFret = activeFrets.length ? Math.min(...activeFrets.map(x => x.f)) : 0;
  const barreGroup = activeFrets.filter(x => x.f === minFret);
  const hasBarre = startFret > 0 && barreGroup.length >= 2;

  if (hasBarre) {
    const bFret = minFret - startFret + 1;
    const barY  = fy(bFret) - FS / 2;
    const x1 = sx(barreGroup[0].i), x2 = sx(barreGroup[barreGroup.length - 1].i);
    svg.appendChild(svgEl('rect', { x: x1 - 7, y: barY - 7, width: x2 - x1 + 14, height: 14, rx: 7, fill: C_DOT, opacity: 0.88 }));
  }

  // Per-string markers
  frets.forEach((fret, s) => {
    const x = sx(s);
    const isRoot = s === rootStringIdx;

    if (fret === -1) {
      // Muted ×
      const y = PT - 16, sz = 4.5;
      svg.appendChild(svgEl('line', { x1: x-sz, y1: y-sz, x2: x+sz, y2: y+sz, stroke: C_MUTE, 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
      svg.appendChild(svgEl('line', { x1: x+sz, y1: y-sz, x2: x-sz, y2: y+sz, stroke: C_MUTE, 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
    } else if (fret === 0) {
      // Open ○
      svg.appendChild(svgEl('circle', { cx: x, cy: PT - 16, r: 5, fill: 'none', stroke: isRoot ? C_DOT : C_OPEN, 'stroke-width': 1.5 }));
    } else {
      const dispFret = fret - startFret + 1;
      if (dispFret >= 1 && dispFret <= FRET_ROWS) {
        const isBarreDot = hasBarre && fret === minFret;
        if (!isBarreDot) {
          const cy = fy(dispFret) - FS / 2;
          svg.appendChild(svgEl('circle', { cx: x, cy, r: 7, fill: C_DOT }));
          if (isRoot) {
            // White centre on root dot
            svg.appendChild(svgEl('circle', { cx: x, cy, r: 3, fill: C_ROOT }));
          }
        }
      }
    }
  });

  container.querySelector('.diagram-label').textContent = label;
  const svgWrap = container.querySelector('.diagram-svg');
  svgWrap.innerHTML = '';
  svgWrap.appendChild(svg);
}

function renderDiagrams() {
  const chord     = CHORDS[currentChord];
  const tuning    = TUNINGS[currentTuning];
  const name      = `${NOTES[rootIndex]} ${currentChord}`;

  const vA = computeVoicing(tuning, rootIndex, chord.intervals, new Set());
  const vB = computeVoicing(tuning, rootIndex, chord.intervals, new Set([vA?.baseFret ?? -1]));

  const boxA = document.getElementById('chordDiagramA');
  const boxB = document.getElementById('chordDiagramB');

  if (vA) buildDiagram(boxA, `${currentTuning} · ${name}`, vA);
  if (vB) {
    buildDiagram(boxB, 'Alt position', vB);
    boxB.style.display = '';
  } else {
    boxB.style.display = 'none';
  }
}

// ── State ─────────────────────────────────────────────────────────────────────

let rootIndex     = 9;        // A
let currentScale  = 'Major';
let currentChord  = 'Major';
let currentTuning = 'Standard';
let currentPage   = 'scales';

// ── DOM refs ──────────────────────────────────────────────────────────────────

const scaleGrid       = document.getElementById('scaleGrid');
const scaleDegreeRow  = document.getElementById('scaleDegreeRow');
const chordGrid       = document.getElementById('chordGrid');
const chordDegreeRow  = document.getElementById('chordDegreeRow');
const scaleTabs       = document.getElementById('scaleTabs');
const chordTabs       = document.getElementById('chordTabs');
const tuningTabsEl    = document.getElementById('tuningTabs');
const sliderLabels    = document.getElementById('sliderLabels');
const rootSlider      = document.getElementById('rootSlider');
const rootDisplay     = document.getElementById('rootDisplay');

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

function buildSliderLabels() {
  for (let i = 0; i < 12; i++) {
    const label = document.createElement('div');
    label.className = 'slider-note-label';
    label.textContent = NOTES[i];
    sliderLabels.appendChild(label);
  }
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

function renderShared() {
  sliderLabels.querySelectorAll('.slider-note-label').forEach((label, i) => {
    label.classList.toggle('current', i === rootIndex);
  });

  rootDisplay.textContent = NOTES[rootIndex];

  const pct = (rootIndex / 11) * 100;
  rootSlider.style.background =
    `linear-gradient(to right, var(--slider-fill) 0%, var(--slider-fill) ${pct}%, var(--slider-track) ${pct}%, var(--slider-track) 100%)`;
}

// ── Page renders ──────────────────────────────────────────────────────────────

function renderScales() {
  const scale = SCALES[currentScale];
  const intervalSet = new Set(scale.intervals);
  const degreeByInterval = {};
  scale.intervals.forEach((iv, i) => { degreeByInterval[iv] = scale.degrees[i]; });
  renderGrid(scaleGrid, scaleDegreeRow, intervalSet, degreeByInterval);
  renderShared();
}

function renderChords() {
  const chord = CHORDS[currentChord];
  const intervalSet = new Set(chord.intervals);
  const degreeByInterval = {};
  chord.intervals.forEach((iv, i) => { degreeByInterval[iv] = chord.degrees[i]; });
  renderGrid(chordGrid, chordDegreeRow, intervalSet, degreeByInterval);
  renderDiagrams();
  renderShared();
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

// ── Slider ────────────────────────────────────────────────────────────────────

rootSlider.addEventListener('input', e => {
  rootIndex = parseInt(e.target.value, 10);
  render();
});

// ── Scroll / trackpad ─────────────────────────────────────────────────────────

let scrollAccum    = 0;
let lastScrollTime = 0;
const SCROLL_THRESHOLD = 35;
const SCROLL_COOLDOWN  = 80;

document.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  scrollAccum += delta;

  const now = Date.now();
  if (Math.abs(scrollAccum) >= SCROLL_THRESHOLD && now - lastScrollTime >= SCROLL_COOLDOWN) {
    const dir   = scrollAccum > 0 ? 1 : -1;
    scrollAccum    = 0;
    lastScrollTime = now;
    rootIndex = (rootIndex + dir + 12) % 12;
    rootSlider.value = rootIndex;
    render();
  }
}, { passive: false });

// ── Init ──────────────────────────────────────────────────────────────────────

buildNoteGrid(scaleGrid, scaleDegreeRow);
buildNoteGrid(chordGrid, chordDegreeRow);

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

buildTabs(tuningTabsEl, TUNINGS,
  () => currentTuning,
  v  => { currentTuning = v; },
  renderChords
);

buildSliderLabels();
render();
