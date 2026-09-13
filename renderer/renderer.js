'use strict';

// ── Music Data ────────────────────────────────────────────────────────────────

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_FLATS = ['', 'Db', '', 'Eb', '', '', 'Gb', '', 'Ab', '', 'Bb', ''];

// Semitone intervals from root (0 = root)
const SCALES = {
  'Major':        { intervals: [0, 2, 4, 5, 7, 9, 11], degrees: ['1', '2', '3', '4', '5', '6', '7'] },
  'Minor':        { intervals: [0, 2, 3, 5, 7, 8, 10], degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
  'Dorian':       { intervals: [0, 2, 3, 5, 7, 9, 10], degrees: ['1', '2', 'b3', '4', '5', '6', 'b7'] },
  'Phrygian':     { intervals: [0, 1, 3, 5, 7, 8, 10], degrees: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'] },
  'Lydian':       { intervals: [0, 2, 4, 6, 7, 9, 11], degrees: ['1', '2', '3', '#4', '5', '6', '7'] },
  'Mixolydian':   { intervals: [0, 2, 4, 5, 7, 9, 10], degrees: ['1', '2', '3', '4', '5', '6', 'b7'] },
  'Locrian':      { intervals: [0, 1, 3, 5, 6, 8, 10], degrees: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'] },
  'Harm. Minor':  { intervals: [0, 2, 3, 5, 7, 8, 11], degrees: ['1', '2', 'b3', '4', '5', 'b6', '7'] },
  'Mel. Minor':   { intervals: [0, 2, 3, 5, 7, 9, 11], degrees: ['1', '2', 'b3', '4', '5', '6', '7'] },
  'Major Penta':  { intervals: [0, 2, 4, 7, 9],        degrees: ['1', '2', '3', '5', '6'] },
  'Minor Penta':  { intervals: [0, 3, 5, 7, 10],       degrees: ['1', 'b3', '4', '5', 'b7'] },
  'Blues':        { intervals: [0, 3, 5, 6, 7, 10],    degrees: ['1', 'b3', '4', 'b5', '5', 'b7'] },
};

// ── State ─────────────────────────────────────────────────────────────────────

let rootIndex = 9;          // A
let currentScale = 'Major';

// ── DOM references ────────────────────────────────────────────────────────────

const noteGrid    = document.getElementById('noteGrid');
const degreeRow   = document.getElementById('degreeRow');
const scaleTabs   = document.getElementById('scaleTabs');
const sliderLabels = document.getElementById('sliderLabels');
const rootSlider  = document.getElementById('rootSlider');
const rootDisplay = document.getElementById('rootDisplay');

// ── Build static DOM ──────────────────────────────────────────────────────────

function buildGrid() {
  for (let i = 0; i < 12; i++) {
    const cell = document.createElement('div');
    cell.className = 'note-cell';
    cell.dataset.slot = i;

    const name = document.createElement('span');
    name.className = 'note-name';

    const flat = document.createElement('span');
    flat.className = 'note-flat';

    cell.appendChild(name);
    cell.appendChild(flat);
    noteGrid.appendChild(cell);

    // Degree label (below grid)
    const deg = document.createElement('div');
    deg.className = 'degree-cell';
    deg.dataset.slot = i;
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
    label.dataset.index = i;
    label.textContent = NOTES[i];
    sliderLabels.appendChild(label);
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const scale = SCALES[currentScale];
  const intervalSet = new Set(scale.intervals);

  // Build interval → degree label map for quick lookup
  const degreeByInterval = {};
  scale.intervals.forEach((interval, i) => {
    degreeByInterval[interval] = scale.degrees[i];
  });

  const cells = noteGrid.querySelectorAll('.note-cell');
  const degreeCells = degreeRow.querySelectorAll('.degree-cell');
  const sliderNoteLabels = sliderLabels.querySelectorAll('.slider-note-label');

  // Each slot i represents (rootIndex + i) % 12 — root is always slot 0
  cells.forEach((cell, i) => {
    const noteIdx = (rootIndex + i) % 12;
    const inScale = intervalSet.has(i);
    const isRoot = i === 0;

    cell.querySelector('.note-name').textContent = NOTES[noteIdx];
    cell.querySelector('.note-flat').textContent = NOTE_FLATS[noteIdx];
    cell.classList.toggle('active', inScale);
    cell.classList.toggle('root', isRoot);

    const deg = degreeCells[i];
    deg.classList.toggle('active', inScale);
    deg.classList.toggle('root-degree', isRoot);
    deg.textContent = degreeByInterval[i] ?? '';
  });

  // Update slider labels
  sliderNoteLabels.forEach((label, i) => {
    label.classList.toggle('current', i === rootIndex);
  });

  // Root display
  rootDisplay.textContent = NOTES[rootIndex];

  // Slider fill
  const pct = (rootIndex / 11) * 100;
  rootSlider.style.background = `linear-gradient(to right, var(--slider-fill) 0%, var(--slider-fill) ${pct}%, var(--slider-track) ${pct}%, var(--slider-track) 100%)`;
}

// ── Events ────────────────────────────────────────────────────────────────────

rootSlider.addEventListener('input', e => {
  rootIndex = parseInt(e.target.value, 10);
  render();
});

// ── Init ──────────────────────────────────────────────────────────────────────

buildGrid();
buildScaleTabs();
buildSliderLabels();
render();
