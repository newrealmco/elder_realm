// dice.js — Dice rolling, SVG shapes, animation, result display

const DICE_CONFIG = {
  d4:  { sides: 4,  color: '#6a3f8f', label: 'D4'  },
  d6:  { sides: 6,  color: '#8b1a1a', label: 'D6'  },
  d8:  { sides: 8,  color: '#1a5f8b', label: 'D8'  },
  d10: { sides: 10, color: '#1a8b3f', label: 'D10' },
  d12: { sides: 12, color: '#8b6b1a', label: 'D12' },
  d20: { sides: 20, color: '#3a3070', label: 'D20' },
};

const MAX_HISTORY = 8;

// ── SVG Shape Generators (44×44 viewBox) ──────────────────────────────────

function svgPath(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z';
}

function polyPoints(cx, cy, n, r, offset = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = offset + (2 * Math.PI * i) / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export function getDiceSVG(die, value, size = 44) {
  const cfg = DICE_CONFIG[die];
  const c = cfg.color;
  const cx = 22, cy = 22, r = 18;
  let shape = '';

  if (die === 'd4') {
    const pts = polyPoints(cx, cy + 3, 3, r, -Math.PI / 2);
    shape = `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${c}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;
  } else if (die === 'd6') {
    shape = `<rect x="5" y="5" width="34" height="34" rx="5" ry="5" fill="${c}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;
  } else if (die === 'd8') {
    const pts = polyPoints(cx, cy, 4, r, 0);
    shape = `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${c}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;
  } else if (die === 'd10') {
    const pts = polyPoints(cx, cy, 5, r, -Math.PI / 2);
    shape = `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${c}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;
  } else if (die === 'd12') {
    const pts = polyPoints(cx, cy, 7, r, -Math.PI / 2);
    shape = `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${c}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;
  } else if (die === 'd20') {
    // Circle with facet lines suggesting icosahedron
    shape = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
      <line x1="${cx}" y1="${cy - r + 4}" x2="${cx - 12}" y2="${cy + 8}" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
      <line x1="${cx}" y1="${cy - r + 4}" x2="${cx + 12}" y2="${cy + 8}" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
      <line x1="${cx - 12}" y1="${cy + 8}" x2="${cx + 12}" y2="${cy + 8}" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
    `;
  }

  const displayVal = value !== undefined ? value : '';

  return `<svg viewBox="0 0 44 44" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    ${shape}
    <text x="22" y="27" text-anchor="middle" font-family="'Cinzel', serif" font-size="${value >= 10 ? '13' : '15'}" fill="white" font-weight="600">${displayVal}</text>
  </svg>`;
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

// ── Dice Panel Initialization ──────────────────────────────────────────────

export function initDicePanel(container, histContainer, onRoll) {
  container.innerHTML = '';
  for (const die of Object.keys(DICE_CONFIG)) {
    const btn = document.createElement('button');
    btn.className = 'die-btn';
    btn.setAttribute('aria-label', `Roll ${die}`);
    btn.innerHTML = `
      ${getDiceSVG(die, undefined, 36)}
      <span class="die-label">${DICE_CONFIG[die].label}</span>
    `;
    btn.addEventListener('click', () => rollAndAnimate(die, histContainer, onRoll));
    container.appendChild(btn);
  }
}

let historyItems = [];
let pendingRolls = [];

export function getPendingRolls() {
  const rolls = pendingRolls.slice();
  pendingRolls = [];
  return rolls;
}

export function hasPendingRolls() {
  return pendingRolls.length > 0;
}

export function rollAndAnimate(die, histContainer, onRoll) {
  const cfg = DICE_CONFIG[die];
  const result = rollDie(cfg.sides);
  const isCrit = result === cfg.sides;
  const isFumble = result === 1 && die === 'd20';

  // Find result area
  const resultArea = document.getElementById('diceResult');
  if (resultArea) {
    resultArea.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'rolling-die';
    wrapper.style.transformStyle = 'preserve-3d';
    wrapper.innerHTML = getDiceSVG(die, result, 44);
    resultArea.appendChild(wrapper);

    // Flash effect for crit/fumble
    if (isCrit) {
      resultArea.style.animation = 'critFlash 0.6s ease';
      setTimeout(() => { resultArea.style.animation = ''; }, 600);
    } else if (isFumble) {
      resultArea.style.animation = 'critFlashRed 0.6s ease';
      setTimeout(() => { resultArea.style.animation = ''; }, 600);
    }
  }

  // Update last result display
  const lastResult = document.getElementById('diceLastResult');
  if (lastResult) lastResult.textContent = `${die.toUpperCase()}: ${result}`;

  // History
  historyItems.unshift({ die, result, isCrit, isFumble });
  if (historyItems.length > MAX_HISTORY) historyItems = historyItems.slice(0, MAX_HISTORY);
  renderDiceHistory(histContainer);

  pendingRolls.push({ die, result, isCrit, isFumble });
  if (onRoll) onRoll({ die, result, isCrit, isFumble });
  return { die, result, isCrit, isFumble };
}

function renderDiceHistory(container) {
  if (!container) return;
  container.innerHTML = '';
  for (const item of historyItems) {
    const el = document.createElement('span');
    el.className = `dice-hist-item ${item.isCrit ? 'crit' : ''} ${item.isFumble ? 'fumble' : ''}`;
    el.textContent = `${item.die}:${item.result}`;
    container.appendChild(el);
  }
}
