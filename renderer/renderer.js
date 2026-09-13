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

// The strip renders 3 full chromatic repetitions (36 cells).
// The viewport clips to 12 cells. Root is always the leftmost visible cell.
// Scrolling by rootIndex positions the strip so the correct chromatic starting
// point appears at position 0 in the viewport.
//
// strip width = 300% (3 × 12 cells)
// cell width  = 1/36 of strip = 1/12 of viewport
// translateX offset = -(rootIndex + 12) / 36 × 100%   (we use the middle 12-repetition)

const STRIP_CELLS = 36; // 3 × 12
const SLIDE_DURATION = '0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

// ── State ─────────────────────────────────────────────────────────────────────

let rootIndex    = 9;       // A
let currentScale = 'Major';

// ── DOM refs ──────────────────────────────────────────────────────────────────

const noteStrip    = document.getElementById('noteStrip');
const scaleTabs    = document.getElementById('scaleTabs');
const sliderLabels = document.getElementById('sliderLabels');
const rootSlider   = document.getElementById('rootSlider');
const rootDisplay  = document.getElementById('rootDisplay');

// ── Build static DOM ──────────────────────────────────────────────────────────

function buildStrip() {
  for (let pos = 0; pos < STRIP_CELLS; pos++) {
    const noteIdx = pos % 12;

    const cell = document.createElement('div');
    cell.className = 'note-cell';
    cell.dataset.pos = pos;

    const name = document.createElement('span');
    name.className = 'note-name';
    name.textContent = NOTES[noteIdx];

    const flat = document.createElement('span');
    flat.className = 'note-flat';
    flat.textContent = NOTE_FLATS[noteIdx];

    const degree = document.createElement('span');
    degree.className = 'note-degree';

    cell.append(name, flat, degree);
    noteStrip.appendChild(cell);
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

function render(skipTransition = false) {
  const scale = SCALES[currentScale];
  const intervalSet = new Set(scale.intervals);
  const degreeByInterval = {};
  scale.intervals.forEach((iv, i) => { degreeByInterval[iv] = scale.degrees[i]; });

  // Slide the strip so rootIndex sits at the leftmost visible cell.
  // We use the middle repetition (offset by 12) so there are cells
  // on both sides to slide in from.
  const offset = (rootIndex + 12) / STRIP_CELLS * 100;

  if (skipTransition) {
    noteStrip.style.transition = 'none';
    noteStrip.style.transform  = `translateX(-${offset}%)`;
    // Re-enable transition after paint
    requestAnimationFrame(() => {
      noteStrip.style.transition = `transform ${SLIDE_DURATION}`;
    });
  } else {
    noteStrip.style.transition = `transform ${SLIDE_DURATION}`;
    noteStrip.style.transform  = `translateX(-${offset}%)`;
  }

  // Update each cell's highlight based on its distance from root
  noteStrip.querySelectorAll('.note-cell').forEach((cell, pos) => {
    const noteIdx  = pos % 12;
    const interval = (noteIdx - rootIndex + 12) % 12;
    const inScale  = intervalSet.has(interval);
    const isRoot   = interval === 0;

    cell.classList.toggle('active', inScale);
    cell.classList.toggle('root',   isRoot);

    const deg = cell.querySelector('.note-degree');
    deg.textContent = degreeByInterval[interval] ?? '';
    deg.classList.toggle('active',   inScale);
    deg.classList.toggle('root-deg', isRoot);
  });

  // Slider labels
  sliderLabels.querySelectorAll('.slider-note-label').forEach((label, i) => {
    label.classList.toggle('current', i === rootIndex);
  });

  // Root name display
  rootDisplay.textContent = NOTES[rootIndex];

  // Slider fill track
  const pct = (rootIndex / 11) * 100;
  rootSlider.style.background =
    `linear-gradient(to right, var(--slider-fill) 0%, var(--slider-fill) ${pct}%, var(--slider-track) ${pct}%, var(--slider-track) 100%)`;
}

// ── Slider interaction ────────────────────────────────────────────────────────

let prevRootIndex = rootIndex;

rootSlider.addEventListener('input', e => {
  const newIndex = parseInt(e.target.value, 10);
  const delta    = Math.abs(newIndex - prevRootIndex);
  rootIndex = newIndex;
  render(delta > 2);
  prevRootIndex = newIndex;
});

// ── Scroll / trackpad interaction ─────────────────────────────────────────────
// Horizontal trackpad swipe or mouse wheel both move the root.
// deltaX  = two-finger side swipe on trackpad
// deltaY  = mouse scroll wheel (vertical only wheel, treated as horizontal nav)
// We accumulate until a threshold is crossed, then step once and reset.
// A short cooldown prevents runaway stepping during high-velocity trackpad flings.

let scrollAccum    = 0;
let lastScrollTime = 0;
const SCROLL_THRESHOLD = 35;  // px before a root step fires
const SCROLL_COOLDOWN  = 80;  // ms minimum between steps

document.addEventListener('wheel', e => {
  e.preventDefault();

  // Prefer horizontal axis; fall back to vertical for standard scroll wheels
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  scrollAccum += delta;

  const now = Date.now();
  if (Math.abs(scrollAccum) >= SCROLL_THRESHOLD && now - lastScrollTime >= SCROLL_COOLDOWN) {
    const direction = scrollAccum > 0 ? 1 : -1;
    scrollAccum    = 0;
    lastScrollTime = now;

    // Wrap around the chromatic circle (B → C and C → B)
    rootIndex = (rootIndex + direction + 12) % 12;
    rootSlider.value = rootIndex;
    render();
  }
}, { passive: false });

// ── Init ──────────────────────────────────────────────────────────────────────

buildStrip();
buildScaleTabs();
buildSliderLabels();
render(true); // no animation on first paint
