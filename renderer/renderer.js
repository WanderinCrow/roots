'use strict';

// ── Music Data ────────────────────────────────────────────────────────────────

const NOTES      = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_FLATS = ['',  'Db', '',  'Eb',  '',  '',  'Gb', '',  'Ab', '',  'Bb',  ''];

const SCALES = {
  'Major':       { intervals: [0,2,4,5,7,9,11],  degrees: ['1','2','3','4','5','6','7'] },
  'Minor':       { intervals: [0,2,3,5,7,8,10],  degrees: ['1','2','b3','4','5','b6','b7'] },
  'Dorian':      { intervals: [0,2,3,5,7,9,10],  degrees: ['1','2','b3','4','5','6','b7'] },
  'Phrygian':    { intervals: [0,1,3,5,7,8,10],  degrees: ['1','b2','b3','4','5','b6','b7'] },
  'Lydian':      { intervals: [0,2,4,6,7,9,11],  degrees: ['1','2','3','#4','5','6','7'] },
  'Mixolydian':  { intervals: [0,2,4,5,7,9,10],  degrees: ['1','2','3','4','5','6','b7'] },
  'Locrian':     { intervals: [0,1,3,5,6,8,10],  degrees: ['1','b2','b3','4','b5','b6','b7'] },
  'Harm. Minor': { intervals: [0,2,3,5,7,8,11],  degrees: ['1','2','b3','4','5','b6','7'] },
  'Mel. Minor':  { intervals: [0,2,3,5,7,9,11],  degrees: ['1','2','b3','4','5','6','7'] },
  'Major Penta': { intervals: [0,2,4,7,9],        degrees: ['1','2','3','5','6'] },
  'Minor Penta': { intervals: [0,3,5,7,10],       degrees: ['1','b3','4','5','b7'] },
  'Blues':       { intervals: [0,3,5,6,7,10],     degrees: ['1','b3','4','b5','5','b7'] },
};

// ── State ─────────────────────────────────────────────────────────────────────

let rootIndex    = 9;       // A
let currentScale = 'Major';

// ── DOM refs ──────────────────────────────────────────────────────────────────

const noteGrid     = document.getElementById('noteGrid');
const degreeRow    = document.getElementById('degreeRow');
const scaleTabs    = document.getElementById('scaleTabs');
const sliderLabels = document.getElementById('sliderLabels');
const rootSlider   = document.getElementById('rootSlider');
const rootDisplay  = document.getElementById('rootDisplay');

// ── Build static DOM ──────────────────────────────────────────────────────────
// Blocks never move — C is always slot 0, B is always slot 11.

function buildGrid() {
  for (let i = 0; i < 12; i++) {
    const cell = document.createElement('div');
    cell.className = 'note-cell';

    const name = document.createElement('span');
    name.className = 'note-name';
    name.textContent = NOTES[i];

    const flat = document.createElement('span');
    flat.className = 'note-flat';
    flat.textContent = NOTE_FLATS[i];

    const degree = document.createElement('span');
    degree.className = 'note-degree';

    cell.append(name, flat, degree);
    noteGrid.appendChild(cell);

    const deg = document.createElement('div');
    deg.className = 'degree-cell';
    degreeRow.appendChild(deg);
  }
}

function buildScaleTabs() {
  Object.keys(SCALES).forEach(name => {
    const tab = document.createElement('button');
    tab.className = 'scale-tab' + (name === currentScale ? ' active' : '');
    tab.textContent = name;
    tab.addEventListener('click', () => {
      currentScale = name;
      document.querySelectorAll('.scale-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      render();
    });
    scaleTabs.appendChild(tab);
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

// ── Render ────────────────────────────────────────────────────────────────────
// Blocks are static. Only CSS classes change — CSS transitions handle the fade.

function render() {
  const scale = SCALES[currentScale];
  const intervalSet = new Set(scale.intervals);
  const degreeByInterval = {};
  scale.intervals.forEach((iv, i) => { degreeByInterval[iv] = scale.degrees[i]; });

  const cells       = noteGrid.querySelectorAll('.note-cell');
  const degreeCells = degreeRow.querySelectorAll('.degree-cell');

  cells.forEach((cell, i) => {
    const interval = (i - rootIndex + 12) % 12;
    const inScale  = intervalSet.has(interval);
    const isRoot   = interval === 0;

    cell.classList.toggle('active', inScale);
    cell.classList.toggle('root',   isRoot);

    const deg = cell.querySelector('.note-degree');
    deg.textContent = degreeByInterval[interval] ?? '';

    const degBelow = degreeCells[i];
    degBelow.classList.toggle('active',      inScale);
    degBelow.classList.toggle('root-degree', isRoot);
    degBelow.textContent = degreeByInterval[interval] ?? '';
  });

  sliderLabels.querySelectorAll('.slider-note-label').forEach((label, i) => {
    label.classList.toggle('current', i === rootIndex);
  });

  rootDisplay.textContent = NOTES[rootIndex];

  const pct = (rootIndex / 11) * 100;
  rootSlider.style.background =
    `linear-gradient(to right, var(--slider-fill) 0%, var(--slider-fill) ${pct}%, var(--slider-track) ${pct}%, var(--slider-track) 100%)`;
}

// ── Slider ────────────────────────────────────────────────────────────────────

rootSlider.addEventListener('input', e => {
  rootIndex = parseInt(e.target.value, 10);
  render();
});

// ── Scroll / trackpad ─────────────────────────────────────────────────────────
// Horizontal trackpad swipe (deltaX) or mouse wheel (deltaY) steps the root.
// Accumulate until threshold, then step once, with a cooldown to prevent
// runaway stepping during fast trackpad flings.

let scrollAccum    = 0;
let lastScrollTime = 0;
const SCROLL_THRESHOLD = 35;
const SCROLL_COOLDOWN  = 80; // ms

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

buildGrid();
buildScaleTabs();
buildSliderLabels();
render();
