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

// ── State ─────────────────────────────────────────────────────────────────────

let rootIndex     = 9;        // A
let currentScale  = 'Major';
let currentChord  = 'Major';
let currentPage   = 'scales';

// ── DOM refs ──────────────────────────────────────────────────────────────────

const scaleGrid       = document.getElementById('scaleGrid');
const scaleDegreeRow  = document.getElementById('scaleDegreeRow');
const chordGrid       = document.getElementById('chordGrid');
const chordDegreeRow  = document.getElementById('chordDegreeRow');
const scaleTabs       = document.getElementById('scaleTabs');
const chordTabs       = document.getElementById('chordTabs');
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

buildSliderLabels();
render();
