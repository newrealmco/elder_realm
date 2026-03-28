// maps.js — Procedural SVG map generation (world + location)

// ── Seeded RNG ─────────────────────────────────────────────────────────────

export function seededRng(seed) {
  let s = typeof seed === 'string'
    ? seed.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0)
    : seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// ── World Map ──────────────────────────────────────────────────────────────

export function generateWorldMap(worldName, currentLocation = '', visitedLocations = []) {
  const r = seededRng(worldName);
  const W = 800, H = 500;

  const elements = [];

  // Ocean background
  elements.push(`<defs>
    <radialGradient id="oceanGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0a1f3a"/>
      <stop offset="100%" stop-color="#050d1f"/>
    </radialGradient>
    <filter id="parchmentShadow">
      <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="rgba(0,0,0,0.8)"/>
    </filter>
  </defs>`);

  elements.push(`<rect width="${W}" height="${H}" fill="url(#oceanGrad)"/>`);

  // Ocean texture — faint wave lines
  for (let i = 0; i < 12; i++) {
    const y = 30 + i * 38;
    const opacity = 0.04 + r() * 0.04;
    elements.push(`<path d="M0,${y} Q${W/4},${y-8} ${W/2},${y} Q${3*W/4},${y+8} ${W},${y}" stroke="rgba(100,180,255,${opacity})" stroke-width="1" fill="none"/>`);
  }

  // Generate land masses (3-5 organic blobs)
  const numLands = 3 + Math.floor(r() * 3);
  const landMasses = [];

  for (let i = 0; i < numLands; i++) {
    const cx = 100 + r() * 600;
    const cy = 80 + r() * 340;
    const baseR = 60 + r() * 100;
    const numPts = 10 + Math.floor(r() * 6);
    const pts = [];

    for (let j = 0; j < numPts; j++) {
      const angle = (j / numPts) * Math.PI * 2;
      const rad = baseR * (0.6 + r() * 0.8);
      pts.push([
        cx + rad * Math.cos(angle),
        cy + rad * Math.sin(angle)
      ]);
    }

    // Smooth with a simple Catmull-Rom approach
    const d = smoothPath(pts, true);
    elements.push(`<path d="${d}" fill="#2d4a1e" opacity="0.85" stroke="#1a3010" stroke-width="1.5"/>`);

    // Land interior texture
    elements.push(`<path d="${d}" fill="url(#landTexture)" opacity="0.3"/>`);

    landMasses.push({ cx, cy, r: baseR, pts });
  }

  // Defs for land texture
  elements.splice(1, 0, `<defs>
    <pattern id="landTexture" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#3a5a28"/>
      <circle cx="5" cy="5" r="0.8" fill="rgba(60,90,40,0.4)"/>
      <circle cx="15" cy="12" r="0.6" fill="rgba(60,90,40,0.3)"/>
    </pattern>
  </defs>`);

  // Mountains — overlapping triangles
  for (const land of landMasses) {
    const numRanges = 2 + Math.floor(r() * 3);
    for (let i = 0; i < numRanges; i++) {
      const mx = land.cx + (r() - 0.5) * land.r * 1.2;
      const my = land.cy + (r() - 0.5) * land.r * 1.2;
      const numMts = 3 + Math.floor(r() * 4);
      for (let j = 0; j < numMts; j++) {
        const x = mx + j * (8 + r() * 6) - numMts * 5;
        const y = my + (r() - 0.5) * 10;
        const h = 12 + r() * 14;
        const w = 8 + r() * 8;
        elements.push(`<polygon points="${x},${y} ${x-w/2},${y+h} ${x+w/2},${y+h}" fill="#6a7a8a" stroke="#4a5a6a" stroke-width="0.8" opacity="0.9"/>`);
        // Snow cap
        const sw = w * 0.4;
        elements.push(`<polygon points="${x},${y} ${x-sw/2},${y+h*0.35} ${x+sw/2},${y+h*0.35}" fill="rgba(240,240,255,0.7)" opacity="0.8"/>`);
      }
    }
  }

  // Forests — clusters of circles
  for (const land of landMasses) {
    const numGroves = 2 + Math.floor(r() * 4);
    for (let i = 0; i < numGroves; i++) {
      const fx = land.cx + (r() - 0.5) * land.r;
      const fy = land.cy + (r() - 0.5) * land.r;
      const numTrees = 6 + Math.floor(r() * 8);
      for (let j = 0; j < numTrees; j++) {
        const tx = fx + (r() - 0.5) * 30;
        const ty = fy + (r() - 0.5) * 20;
        const tr = 4 + r() * 5;
        elements.push(`<circle cx="${tx}" cy="${ty}" r="${tr}" fill="#1a3a0a" opacity="${0.7 + r() * 0.2}"/>`);
      }
    }
  }

  // Rivers — thin winding paths across land
  for (let i = 0; i < 3; i++) {
    if (landMasses.length === 0) break;
    const land = landMasses[i % landMasses.length];
    const sx = land.cx + (r() - 0.3) * land.r;
    const sy = land.cy - land.r * 0.3;
    const pts = [[sx, sy]];
    for (let j = 0; j < 5; j++) {
      const last = pts[pts.length - 1];
      pts.push([last[0] + (r() - 0.3) * 30, last[1] + 15 + r() * 15]);
    }
    const d = smoothPath(pts, false);
    elements.push(`<path d="${d}" fill="none" stroke="rgba(100,180,255,0.6)" stroke-width="${1 + r()}" opacity="0.7"/>`);
  }

  // Named locations (6–8)
  const locationNames = generateLocationNames(worldName, r);
  const locPositions = [];

  for (let i = 0; i < locationNames.length; i++) {
    let attempts = 0, lx, ly;
    do {
      lx = 60 + r() * 680;
      ly = 50 + r() * 400;
      attempts++;
    } while (attempts < 20 && locPositions.some(p => Math.hypot(p.x - lx, p.y - ly) < 80));

    locPositions.push({ x: lx, y: ly, name: locationNames[i] });

    const isCurrentLocation = locationNames[i].toLowerCase().includes(currentLocation.toLowerCase()) ||
                               currentLocation.toLowerCase().includes(locationNames[i].toLowerCase().split(' ')[0]);

    const type = getLocationType(locationNames[i]);
    elements.push(renderLocationMarker(lx, ly, locationNames[i], type, isCurrentLocation));
  }

  // Party position — find matching location or generate a deterministic one
  let partyX, partyY;
  const matchedLoc = locPositions.find(p => {
    const a = p.name.toLowerCase(), b = currentLocation.toLowerCase();
    return a === b || a.includes(b.split(' ')[0]) || b.includes(a.split(' ')[0]);
  });

  if (matchedLoc) {
    partyX = matchedLoc.x;
    partyY = matchedLoc.y;
  } else if (currentLocation) {
    // Deterministic position based on location name, placed on a land mass
    const lr = seededRng(currentLocation);
    if (landMasses.length > 0) {
      const land = landMasses[Math.floor(lr() * landMasses.length)];
      partyX = land.cx + (lr() - 0.5) * land.r * 0.8;
      partyY = land.cy + (lr() - 0.5) * land.r * 0.8;
    } else {
      partyX = 100 + lr() * 600;
      partyY = 80 + lr() * 340;
    }
    // Render a small label for the current location
    elements.push(`<text x="${partyX}" y="${partyY - 18}" text-anchor="middle" font-family="'Cinzel', serif" font-size="8" fill="rgba(100,180,255,0.9)" stroke="rgba(5,3,2,0.8)" stroke-width="2" paint-order="stroke">${currentLocation}</text>`);
  }

  // Draw party marker
  if (partyX !== undefined) {
    // Pulsing glow
    elements.push(`<circle cx="${partyX}" cy="${partyY}" r="18" fill="none" stroke="rgba(100,180,255,0.5)" stroke-width="1.5">
      <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite"/>
    </circle>`);
    // Solid marker
    elements.push(`<circle cx="${partyX}" cy="${partyY}" r="6" fill="rgba(100,180,255,0.9)" stroke="white" stroke-width="2"/>`);
    elements.push(`<circle cx="${partyX}" cy="${partyY}" r="3" fill="white"/>`);
  }

  // Draw visited location trail
  for (const visited of visitedLocations) {
    if (visited === currentLocation) continue;
    const vr = seededRng(visited);
    let vx, vy;
    const vMatch = locPositions.find(p => {
      const a = p.name.toLowerCase(), b = visited.toLowerCase();
      return a === b || a.includes(b.split(' ')[0]) || b.includes(a.split(' ')[0]);
    });
    if (vMatch) {
      vx = vMatch.x; vy = vMatch.y;
    } else if (landMasses.length > 0) {
      const land = landMasses[Math.floor(vr() * landMasses.length)];
      vx = land.cx + (vr() - 0.5) * land.r * 0.8;
      vy = land.cy + (vr() - 0.5) * land.r * 0.8;
    }
    if (vx !== undefined) {
      elements.push(`<circle cx="${vx}" cy="${vy}" r="3" fill="rgba(100,180,255,0.3)" stroke="rgba(100,180,255,0.4)" stroke-width="1"/>`);
    }
  }

  // Compass rose (bottom-right)
  elements.push(renderCompassRose(730, 450));

  // Map title
  elements.push(`<text x="${W/2}" y="${H - 12}" text-anchor="middle" font-family="'Cinzel', serif" font-size="14" fill="rgba(184,134,11,0.8)" letter-spacing="0.1em">${worldName.toUpperCase()}</text>`);

  // Parchment border effect
  elements.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="rgba(184,134,11,0.5)" stroke-width="3"/>`);
  elements.push(`<rect x="3" y="3" width="${W-6}" height="${H-6}" fill="none" stroke="rgba(184,134,11,0.2)" stroke-width="1"/>`);

  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%">
    ${elements.join('\n  ')}
  </svg>`;

  return { svg, locations: locPositions };
}

function getLocationType(name) {
  const n = name.toLowerCase();
  if (n.includes('dungeon') || n.includes('crypt') || n.includes('tomb') || n.includes('catacombs')) return 'dungeon';
  if (n.includes('ruin') || n.includes('fallen') || n.includes('lost') || n.includes('ancient')) return 'ruins';
  if (n.includes('castle') || n.includes('fort') || n.includes('keep') || n.includes('citadel')) return 'castle';
  if (n.includes('village') || n.includes('hamlet') || n.includes('stead')) return 'village';
  if (n.includes('forest') || n.includes('wood') || n.includes('grove')) return 'forest';
  if (n.includes('city') || n.includes('town') || n.includes('hold')) return 'city';
  return 'city';
}

function renderLocationMarker(x, y, name, type, isCurrent) {
  const parts = [];
  const gold = 'rgba(184,134,11,0.9)';
  const bright = '#f0c040';

  if (isCurrent) {
    parts.push(`<circle cx="${x}" cy="${y}" r="14" fill="none" stroke="${bright}" stroke-width="1.5" opacity="0.6">
      <animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
    </circle>`);
  }

  if (type === 'dungeon') {
    // Skull icon
    parts.push(`<circle cx="${x}" cy="${y}" r="5" fill="#2a1a0a" stroke="${gold}" stroke-width="1.5"/>`);
    parts.push(`<text x="${x}" y="${y+3}" text-anchor="middle" font-size="7" fill="${bright}">☠</text>`);
  } else if (type === 'ruins') {
    // X marker
    parts.push(`<line x1="${x-4}" y1="${y-4}" x2="${x+4}" y2="${y+4}" stroke="${gold}" stroke-width="2"/>`);
    parts.push(`<line x1="${x+4}" y1="${y-4}" x2="${x-4}" y2="${y+4}" stroke="${gold}" stroke-width="2"/>`);
  } else if (type === 'village') {
    // Square
    parts.push(`<rect x="${x-4}" y="${y-4}" width="8" height="8" fill="#3a2a1a" stroke="${gold}" stroke-width="1.5"/>`);
  } else {
    // Circle for city/castle/etc
    parts.push(`<circle cx="${x}" cy="${y}" r="5" fill="#2a1a0a" stroke="${gold}" stroke-width="1.5"/>`);
    parts.push(`<circle cx="${x}" cy="${y}" r="2" fill="${gold}"/>`);
  }

  // Name label
  const textY = y - 10;
  parts.push(`<text x="${x}" y="${textY}" text-anchor="middle" font-family="'Cinzel', serif" font-size="8" fill="rgba(244,234,213,0.85)" stroke="rgba(5,3,2,0.8)" stroke-width="2" paint-order="stroke">${name}</text>`);

  return parts.join('\n');
}

function renderCompassRose(cx, cy) {
  const gold = 'rgba(184,134,11,0.8)';
  const r = 18;
  const pts = [
    [cx, cy - r], [cx + 5, cy - 5],
    [cx + r, cy], [cx + 5, cy + 5],
    [cx, cy + r], [cx - 5, cy + 5],
    [cx - r, cy], [cx - 5, cy - 5]
  ];
  const d = pts.map((p, i) => `${i === 0 ? 'M' : i % 2 === 0 ? 'L' : 'L'}${p[0]},${p[1]}`).join(' ') + 'Z';

  return `
    <g opacity="0.9">
      <path d="M${cx},${cy-r} L${cx+4},${cy-4} L${cx},${cy+r} L${cx-4},${cy-4} Z" fill="${gold}" opacity="0.7"/>
      <path d="M${cx+r},${cy} L${cx+4},${cy+4} L${cx-r},${cy} L${cx-4},${cy-4} Z" fill="rgba(184,134,11,0.4)" opacity="0.7"/>
      <circle cx="${cx}" cy="${cy}" r="4" fill="#2a1a0a" stroke="${gold}" stroke-width="1.5"/>
      <circle cx="${cx}" cy="${cy}" r="2" fill="${gold}"/>
      <text x="${cx}" y="${cy - r - 3}" text-anchor="middle" font-family="'Cinzel', serif" font-size="7" fill="${gold}">N</text>
    </g>
  `;
}

function generateLocationNames(worldSeed, r) {
  const prefixes = ['Iron','Silver','Shadow','Storm','Elder','Dark','High','Lost','Fallen','Golden',
                    "Dusk's","Thornwood","Ashenvale","Ravenspire","Grimhold"];
  const suffixes = ['Keep','Hold','Vale','Mere','Crossing','Bridge','Fort','Gate','Tower','Watch',
                    'Hollow','Crypt','Ruins','Citadel','Village'];
  const singles  = ['Thornbridge','Ashenvale','Shadowmere','Ironhold','Ravenspire',
                    'Duskhaven','Grimcroft','Stonewood','Blackmoor','Coldwater'];

  const names = new Set();
  // Mix singles and compound names
  for (let i = 0; i < 8; i++) {
    if (r() > 0.5) {
      names.add(singles[Math.floor(r() * singles.length)]);
    } else {
      const p = prefixes[Math.floor(r() * prefixes.length)];
      const s = suffixes[Math.floor(r() * suffixes.length)];
      names.add(`${p} ${s}`);
    }
  }
  return [...names].slice(0, 8);
}

// Smooth path through points (simple cubic bezier approximation)
function smoothPath(pts, closed) {
  if (pts.length < 2) return '';
  const d = [`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev[0] + curr[0]) / 2;
    const cpy = (prev[1] + curr[1]) / 2;
    d.push(`Q${cpx.toFixed(1)},${cpy.toFixed(1)} ${curr[0].toFixed(1)},${curr[1].toFixed(1)}`);
  }
  if (closed) d.push('Z');
  return d.join(' ');
}

// ── Location Map ───────────────────────────────────────────────────────────

export function generateLocationMap(locationName) {
  const r = seededRng(locationName);
  const W = 380, H = 200;
  const type = detectLocationType(locationName);

  const elements = [];

  switch (type) {
    case 'dungeon': elements.push(...genDungeonMap(r, W, H)); break;
    case 'tavern':  elements.push(...genTavernMap(r, W, H));  break;
    case 'forest':  elements.push(...genForestMap(r, W, H));  break;
    case 'castle':  elements.push(...genCastleMap(r, W, H));  break;
    case 'town':    elements.push(...genTownMap(r, W, H));    break;
    default:        elements.push(...genWildernessMap(r, W, H)); break;
  }

  // Label
  elements.push(`<text x="${W/2}" y="${H - 5}" text-anchor="middle" font-family="'Cinzel', serif" font-size="9" fill="rgba(184,134,11,0.7)" letter-spacing="0.08em">${locationName}</text>`);

  // Border
  elements.push(`<rect x="1" y="1" width="${W-2}" height="${H-2}" fill="none" stroke="rgba(184,134,11,0.4)" stroke-width="1"/>`);

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-height:200px">
    ${elements.join('\n  ')}
  </svg>`;
}

export function detectLocationType(name) {
  const n = name.toLowerCase();
  if (n.includes('dungeon') || n.includes('cave') || n.includes('crypt') || n.includes('catacombs') || n.includes('tomb')) return 'dungeon';
  if (n.includes('tavern') || n.includes('inn') || n.includes('alehouse')) return 'tavern';
  if (n.includes('forest') || n.includes('wood') || n.includes('grove') || n.includes('thicket')) return 'forest';
  if (n.includes('castle') || n.includes('fort') || n.includes('keep') || n.includes('citadel') || n.includes('tower')) return 'castle';
  if (n.includes('town') || n.includes('city') || n.includes('village') || n.includes('hamlet') || n.includes('hold')) return 'town';
  return 'wilderness';
}

function genDungeonMap(r, W, H) {
  const els = [];
  // Stone floor
  els.push(`<rect width="${W}" height="${H}" fill="#0d0a08"/>`);
  // Grid texture
  for (let x = 0; x < W; x += 20)
    els.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(80,70,60,0.15)" stroke-width="0.5"/>`);
  for (let y = 0; y < H; y += 20)
    els.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(80,70,60,0.15)" stroke-width="0.5"/>`);

  // Rooms
  const rooms = [];
  const numRooms = 4 + Math.floor(r() * 4);
  for (let i = 0; i < numRooms; i++) {
    const rw = 40 + r() * 60, rh = 30 + r() * 40;
    const rx = 10 + r() * (W - rw - 20), ry = 10 + r() * (H - rh - 20);
    rooms.push({ x: rx, y: ry, w: rw, h: rh });
    els.push(`<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="#1a1410" stroke="#4a3a2a" stroke-width="2"/>`);
    // Torch
    const tx = rx + r() * rw, ty = ry + r() * rh;
    els.push(`<circle cx="${tx}" cy="${ty}" r="3" fill="#ff7700" opacity="0.8">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="${1.5 + r()}s" repeatCount="indefinite"/>
    </circle>`);
    els.push(`<circle cx="${tx}" cy="${ty}" r="8" fill="rgba(255,119,0,0.15)" opacity="0.5"/>`);
  }

  // Corridors connecting adjacent rooms
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
    const bx = b.x + b.w / 2, by = b.y + b.h / 2;
    els.push(`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#2a2018" stroke-width="8"/>`);
    els.push(`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#3a2a18" stroke-width="5"/>`);
  }

  // Party marker
  if (rooms.length > 0) {
    const sr = rooms[0];
    els.push(`<circle cx="${sr.x + sr.w/2}" cy="${sr.y + sr.h/2}" r="5" fill="rgba(100,180,255,0.8)" stroke="white" stroke-width="1"/>`);
  }

  return els;
}

function genTavernMap(r, W, H) {
  const els = [];
  // Floor
  els.push(`<rect width="${W}" height="${H}" fill="#1a1008"/>`);
  // Wooden plank lines
  for (let y = 0; y < H; y += 14)
    els.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(100,70,30,0.2)" stroke-width="0.5"/>`);

  // Bar counter (top area)
  els.push(`<rect x="10" y="10" width="${W - 60}" height="22" rx="3" fill="#3a2010" stroke="#8b6b1a" stroke-width="1.5"/>`);
  els.push(`<text x="${W/2 - 30}" y="25" font-family="'Cinzel',serif" font-size="7" fill="rgba(184,134,11,0.7)">BAR</text>`);

  // Fireplace
  els.push(`<rect x="${W - 45}" y="8" width="30" height="28" rx="2" fill="#2a0a00" stroke="#8b4a1a" stroke-width="1.5"/>`);
  els.push(`<ellipse cx="${W - 30}" cy="${30}" rx="8" ry="5" fill="#ff4400" opacity="0.7">
    <animate attributeName="ry" values="5;7;4;6;5" dur="0.8s" repeatCount="indefinite"/>
  </ellipse>`);

  // Tables (4–6)
  const numTables = 4 + Math.floor(r() * 3);
  for (let i = 0; i < numTables; i++) {
    const tx = 20 + r() * (W - 80), ty = 50 + r() * (H - 80);
    els.push(`<ellipse cx="${tx}" cy="${ty}" rx="18" ry="12" fill="#2a1a08" stroke="#6a4a1a" stroke-width="1.5"/>`);
    // Chairs around table
    for (let c = 0; c < 4; c++) {
      const a = (c / 4) * Math.PI * 2;
      const cx2 = tx + 24 * Math.cos(a), cy2 = ty + 16 * Math.sin(a);
      els.push(`<rect x="${cx2-4}" y="${cy2-4}" width="8" height="8" rx="2" fill="#1a0e04" stroke="#4a3010" stroke-width="1"/>`);
    }
  }

  // Stairs
  els.push(`<rect x="${W-30}" y="${H-35}" width="22" height="28" fill="none" stroke="#6a4a1a" stroke-width="1.2"/>`);
  for (let s = 0; s < 4; s++)
    els.push(`<line x1="${W-30}" y1="${H-35+s*7}" x2="${W-8}" y2="${H-35+s*7}" stroke="#6a4a1a" stroke-width="0.8"/>`);
  els.push(`<text x="${W-30}" y="${H-40}" font-family="'Cinzel',serif" font-size="6" fill="rgba(184,134,11,0.6)">STAIRS</text>`);

  // Party marker
  els.push(`<circle cx="30" cy="60" r="5" fill="rgba(100,180,255,0.8)" stroke="white" stroke-width="1"/>`);

  return els;
}

function genForestMap(r, W, H) {
  const els = [];
  // Ground
  els.push(`<rect width="${W}" height="${H}" fill="#0d1a08"/>`);
  // Grass patches
  for (let i = 0; i < 30; i++) {
    const gx = r() * W, gy = r() * H, gr = 20 + r() * 40;
    els.push(`<circle cx="${gx}" cy="${gy}" r="${gr}" fill="rgba(30,60,15,0.4)"/>`);
  }

  // Trees
  const numTrees = 30 + Math.floor(r() * 20);
  for (let i = 0; i < numTrees; i++) {
    const tx = r() * W, ty = r() * H;
    const tr = 8 + r() * 12;
    const th = tr * 1.5;
    // Trunk
    els.push(`<line x1="${tx}" y1="${ty+tr*0.3}" x2="${tx}" y2="${ty+th}" stroke="#3a2010" stroke-width="${2+r()*2}"/>`);
    // Canopy
    els.push(`<circle cx="${tx}" cy="${ty}" r="${tr}" fill="${r() > 0.5 ? '#1a3a0a' : '#0f2a06'}" opacity="${0.7 + r() * 0.25}"/>`);
  }

  // Clearing
  const clx = 120 + r() * (W - 240), cly = 50 + r() * (H - 100), clr = 30 + r() * 30;
  els.push(`<ellipse cx="${clx}" cy="${cly}" rx="${clr}" ry="${clr * 0.6}" fill="#1a3008" opacity="0.6"/>`);

  // Stream
  const sy0 = 30 + r() * 80;
  let spts = [[0, sy0]];
  for (let i = 1; i <= 6; i++) {
    const last = spts[spts.length - 1];
    spts.push([last[0] + W/6 + (r()-0.5)*20, last[1] + (r()-0.4)*30]);
  }
  const streamD = smoothPath(spts, false);
  els.push(`<path d="${streamD}" fill="none" stroke="rgba(80,160,220,0.6)" stroke-width="3"/>`);
  els.push(`<path d="${streamD}" fill="none" stroke="rgba(120,200,255,0.3)" stroke-width="1.5"/>`);

  // Party marker
  els.push(`<circle cx="${clx}" cy="${cly}" r="5" fill="rgba(100,180,255,0.8)" stroke="white" stroke-width="1"/>`);

  return els;
}

function genCastleMap(r, W, H) {
  const els = [];
  // Stone courtyard
  els.push(`<rect width="${W}" height="${H}" fill="#141210"/>`);
  // Stone grid
  for (let x = 0; x < W; x += 25)
    for (let y = 0; y < H; y += 20)
      els.push(`<rect x="${x+0.5}" y="${y+0.5}" width="24" height="19" fill="rgba(40,35,28,${0.3 + r() * 0.2})" stroke="rgba(60,50,40,0.2)" stroke-width="0.5"/>`);

  // Outer wall
  const wallOuter = 8;
  els.push(`<rect x="${wallOuter}" y="${wallOuter}" width="${W - 2*wallOuter}" height="${H - 2*wallOuter}" fill="none" stroke="#4a3a28" stroke-width="8"/>`);

  // Towers at corners
  const tSize = 18;
  const corners = [[wallOuter-4, wallOuter-4], [W-wallOuter-14, wallOuter-4],
                   [wallOuter-4, H-wallOuter-14], [W-wallOuter-14, H-wallOuter-14]];
  for (const [tx, ty] of corners) {
    els.push(`<rect x="${tx}" y="${ty}" width="${tSize}" height="${tSize}" fill="#2a2018" stroke="#6a5a3a" stroke-width="2"/>`);
    // Battlement marks
    for (let i = 0; i < 3; i++)
      els.push(`<rect x="${tx + 2 + i*5}" y="${ty}" width="3" height="4" fill="#1a1408"/>`);
  }

  // Gate
  els.push(`<rect x="${W/2 - 14}" y="${wallOuter - 4}" width="28" height="16" rx="0" fill="#1a1008" stroke="#8b6b1a" stroke-width="2"/>`);
  els.push(`<path d="M${W/2-14},${wallOuter+12} Q${W/2},${wallOuter-2} ${W/2+14},${wallOuter+12}" fill="none" stroke="#8b6b1a" stroke-width="1.5"/>`);

  // Inner courtyard
  els.push(`<rect x="${W/2-35}" y="${H/2-30}" width="70" height="60" fill="#1a1610" stroke="#4a3a28" stroke-width="2"/>`);
  // Well
  els.push(`<circle cx="${W/2}" cy="${H/2}" r="8" fill="none" stroke="#6a5a3a" stroke-width="2"/>`);
  els.push(`<circle cx="${W/2}" cy="${H/2}" r="3" fill="#0a0806"/>`);

  // Party marker
  els.push(`<circle cx="${W/2}" cy="${H/2 - 20}" r="5" fill="rgba(100,180,255,0.8)" stroke="white" stroke-width="1"/>`);

  return els;
}

function genTownMap(r, W, H) {
  const els = [];
  // Ground
  els.push(`<rect width="${W}" height="${H}" fill="#1a1408"/>`);

  // Main roads
  els.push(`<line x1="${W/2}" y1="0" x2="${W/2}" y2="${H}" stroke="#2a2010" stroke-width="12"/>`);
  els.push(`<line x1="0" y1="${H/2}" x2="${W}" y2="${H/2}" stroke="#2a2010" stroke-width="12"/>`);
  // Road texture
  els.push(`<line x1="${W/2}" y1="0" x2="${W/2}" y2="${H}" stroke="rgba(60,50,30,0.5)" stroke-width="1" stroke-dasharray="8,6"/>`);
  els.push(`<line x1="0" y1="${H/2}" x2="${W}" y2="${H/2}" stroke="rgba(60,50,30,0.5)" stroke-width="1" stroke-dasharray="8,6"/>`);

  // Buildings in each quadrant
  for (let q = 0; q < 4; q++) {
    const qx = q % 2 === 0 ? 10 : W/2 + 10;
    const qy = q < 2 ? 10 : H/2 + 10;
    const numBuildings = 3 + Math.floor(r() * 4);
    for (let i = 0; i < numBuildings; i++) {
      const bx = qx + r() * (W/2 - 50), by = qy + r() * (H/2 - 40);
      const bw = 16 + r() * 24, bh = 12 + r() * 20;
      // Building body
      els.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#2a1a0a" stroke="#4a3010" stroke-width="1.2"/>`);
      // Roof
      els.push(`<polygon points="${bx},${by} ${bx+bw/2},${by-8} ${bx+bw},${by}" fill="#3a1a08" stroke="#5a2a10" stroke-width="1"/>`);
    }
  }

  // Market stalls near center
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const mx = W/2 + 28 * Math.cos(a), my = H/2 + 22 * Math.sin(a);
    els.push(`<rect x="${mx - 8}" y="${my - 5}" width="16" height="10" fill="#1a3008" stroke="#3a6010" stroke-width="1"/>`);
  }

  // Well at center
  els.push(`<circle cx="${W/2}" cy="${H/2}" r="7" fill="none" stroke="#6a5a3a" stroke-width="2"/>`);

  // Party marker
  els.push(`<circle cx="${W/2}" cy="${H/2 - 16}" r="5" fill="rgba(100,180,255,0.8)" stroke="white" stroke-width="1"/>`);

  return els;
}

function genWildernessMap(r, W, H) {
  const els = [];
  // Ground
  els.push(`<rect width="${W}" height="${H}" fill="#0f1a08"/>`);

  // Terrain patches
  for (let i = 0; i < 15; i++) {
    const px = r() * W, py = r() * H, pr = 15 + r() * 40;
    els.push(`<circle cx="${px}" cy="${py}" r="${pr}" fill="rgba(25,40,12,0.5)"/>`);
  }

  // Rocks
  for (let i = 0; i < 12; i++) {
    const rx = 10 + r() * (W - 20), ry = 10 + r() * (H - 20);
    const rr = 4 + r() * 10;
    els.push(`<ellipse cx="${rx}" cy="${ry}" rx="${rr}" ry="${rr * 0.7}" fill="#3a3028" stroke="#5a4a38" stroke-width="0.8" opacity="0.9"/>`);
  }

  // Campfire (center area)
  const cfx = W * 0.35 + r() * W * 0.3, cfy = H * 0.35 + r() * H * 0.3;
  // Fire ring
  els.push(`<circle cx="${cfx}" cy="${cfy}" r="10" fill="rgba(80,30,0,0.5)" stroke="#4a2008" stroke-width="1"/>`);
  // Flame
  els.push(`<ellipse cx="${cfx}" cy="${cfy - 3}" rx="4" ry="6" fill="#ff6600" opacity="0.8">
    <animate attributeName="ry" values="6;8;5;7;6" dur="0.6s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.8;1;0.6;0.9;0.8" dur="0.6s" repeatCount="indefinite"/>
  </ellipse>`);
  els.push(`<ellipse cx="${cfx}" cy="${cfy - 5}" rx="2" ry="4" fill="#ffcc00" opacity="0.7">
    <animate attributeName="ry" values="4;6;3;5;4" dur="0.5s" repeatCount="indefinite"/>
  </ellipse>`);

  // Path
  const pathPts = [[r()*40, r()*H], [W*0.4+r()*W*0.2, H*0.4+r()*H*0.2], [W-r()*40, r()*H]];
  const pathD = smoothPath(pathPts, false);
  els.push(`<path d="${pathD}" fill="none" stroke="rgba(100,80,40,0.5)" stroke-width="4" stroke-dasharray="6,4"/>`);

  // Party marker
  els.push(`<circle cx="${cfx}" cy="${cfy - 14}" r="5" fill="rgba(100,180,255,0.8)" stroke="white" stroke-width="1"/>`);

  return els;
}
