// ui.js — DOM rendering, panel management, tabs, modals

import { RACES, CLASSES, CLASS_EMOJI, GENDERS, GENDER_SYMBOL, generateCompanion, getHpBarGradient, getStatus } from './characters.js';
import { getDiceSVG } from './dice.js';
import { getBudgetState, setBudget, renderBudgetDisplay } from './budget.js';
import { getApiKey } from './api.js';
import {
  PROVIDERS, getSelectedProvider, setSelectedProvider,
  getEffectiveModel, setSelectedModel,
  getProviderApiKey, setProviderApiKey,
} from './providers.js';

// ── Title Screen ───────────────────────────────────────────────────────────

export function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const stars = Array.from({ length: 160 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.3 + Math.random() * 1.2,
    phase: Math.random() * Math.PI * 2,
    speed: 0.3 + Math.random() * 1.2,
  }));

  let running = true;
  let startTime = Date.now();

  function draw() {
    if (!running) return;
    const t = (Date.now() - startTime) / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      const opacity = 0.15 + 0.7 * (0.5 + 0.5 * Math.sin(s.phase + t * s.speed));
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,240,${opacity})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();

  return () => { running = false; };
}

export function initRunicStrip() {
  const el = document.getElementById('runicStrip');
  if (!el) return;
  const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  el.textContent = Array.from({ length: 30 }, () => runes[Math.floor(Math.random() * runes.length)]).join(' ');
}

// ── Character Generation Modal ─────────────────────────────────────────────

let companions = [];

export function initCharGenModal(onBegin) {
  const modal    = document.getElementById('charGenModal');
  const nameInput = document.getElementById('playerName');
  const raceSelect = document.getElementById('playerRace');
  const classSelect = document.getElementById('playerClass');
  const genderSelect = document.getElementById('playerGender');
  const beginBtn = document.getElementById('beginAdventure');
  const rerollBtn = document.getElementById('rerollBtn');

  // Populate dropdowns
  for (const race of RACES) {
    const opt = document.createElement('option');
    opt.value = race; opt.textContent = race;
    raceSelect.appendChild(opt);
  }
  for (const cls of CLASSES) {
    const opt = document.createElement('option');
    opt.value = cls; opt.textContent = cls;
    classSelect.appendChild(opt);
  }
  for (const g of GENDERS) {
    const opt = document.createElement('option');
    opt.value = g; opt.textContent = `${GENDER_SYMBOL[g]} ${g}`;
    genderSelect.appendChild(opt);
  }

  // Generate initial companions
  generateNewCompanions();

  // Validation
  function validate() {
    beginBtn.disabled = nameInput.value.trim().length < 2;
  }
  nameInput.addEventListener('input', validate);

  rerollBtn.addEventListener('click', generateNewCompanions);

  beginBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name.length < 2) return;
    modal.style.display = 'none';
    onBegin({
      name,
      race: raceSelect.value,
      cls:  classSelect.value,
      gender: genderSelect.value,
      companions: companions.slice(),
    });
  });

  modal.style.display = 'flex';
}

function generateNewCompanions() {
  companions = [
    generateCompanion(0),
    generateCompanion(1),
    generateCompanion(2),
  ];
  renderCompanionCards();
}

function renderCompanionCards() {
  const container = document.getElementById('companionCards');
  if (!container) return;
  container.innerHTML = '';
  for (const c of companions) {
    const el = document.createElement('div');
    el.className = 'companion-card-gen';
    el.innerHTML = `
      <span class="companion-emoji">${CLASS_EMOJI[c.cls] || '⚔️'}</span>
      <div class="companion-info">
        <div class="companion-name">${c.name} <span class="gender-symbol">${GENDER_SYMBOL[c.gender] || ''}</span></div>
        <div class="companion-race-class">${c.race} · ${c.cls}</div>
      </div>
    `;
    container.appendChild(el);
  }
}

// ── Party Cards ────────────────────────────────────────────────────────────

export function renderPartyCards(party, selectedIndex, onSelect) {
  const container = document.getElementById('partyCards');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < party.length; i++) {
    const c = party[i];
    const pct = c.hpMax > 0 ? (c.hp / c.hpMax) * 100 : 0;
    const gradient = getHpBarGradient(c.hp, c.hpMax);
    const status = getStatus(c.hp, c.hpMax);

    const card = document.createElement('div');
    card.className = `party-card${c.isPlayer ? ' player-card' : ''}${i === selectedIndex ? ' selected' : ''} status-${status}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${c.name} ${c.race} ${c.cls} HP ${c.hp}/${c.hpMax}`);

    const condBadges = c.conditions.length
      ? `<div class="conditions-row">${c.conditions.map(cond => `<span class="condition-badge">${cond}</span>`).join('')}</div>`
      : '';

    card.innerHTML = `
      <div class="card-header">
        <div class="card-avatar">${c.emoji}</div>
        <div class="card-info">
          <div class="card-name">${c.isPlayer ? '★ ' : ''}${c.name} <span class="gender-symbol">${GENDER_SYMBOL[c.gender] || ''}</span></div>
          <div class="card-subtitle">${c.race} ${c.cls} · Lv.${c.level}</div>
        </div>
      </div>
      <div class="hp-bar-wrap">
        <div class="hp-bar-bg">
          <div class="hp-bar-fill" style="width:${Math.max(0, pct).toFixed(1)}%;background:${gradient}"></div>
        </div>
        <span class="hp-text">${c.hp}/${c.hpMax}</span>
      </div>
      <div class="card-stats-row">
        ${['str','dex','con','int','wis','cha'].map(s =>
          `<div class="stat-cell">
            <span class="stat-value">${c[s]}</span>
            <span class="stat-label">${s.toUpperCase()}</span>
          </div>`
        ).join('')}
      </div>
      ${condBadges}
    `;

    card.addEventListener('click',  () => onSelect(i));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } });
    container.appendChild(card);
  }
}

// ── Narrative Area ─────────────────────────────────────────────────────────

export function addNarrativeMessage(type, text, options = {}) {
  const area = document.getElementById('narrativeArea');
  if (!area) return;

  const el = document.createElement('div');
  el.className = `narrative-msg msg-${type}`;

  if (type === 'dm') {
    const label = options.playerName
      ? `📜 DUNGEON MASTER`
      : '📜 DUNGEON MASTER';
    el.innerHTML = `
      <div class="msg-label label-dm">${label}</div>
      <div class="msg-body">${renderMarkdown(text)}</div>
    `;
    if (options.quickActions && options.quickActions.length > 0) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'quick-actions';
      for (const action of options.quickActions) {
        const btn = document.createElement('button');
        btn.className = 'quick-action-btn';
        btn.textContent = action;
        btn.addEventListener('click', () => {
          if (options.onAction) options.onAction(action);
        });
        actionsDiv.appendChild(btn);
      }
      el.appendChild(actionsDiv);
    }
  } else if (type === 'player') {
    const name = options.playerName || 'You';
    el.innerHTML = `
      <div class="msg-label label-player">⭐ ${name.toUpperCase()}</div>
      <div class="msg-body">${escapeHtml(text)}</div>
    `;
  } else if (type === 'system') {
    el.innerHTML = `<div class="msg-body">${text}</div>`;
  } else if (type === 'chapter') {
    el.innerHTML = `
      <div class="chapter-rule"></div>
      <div class="chapter-title">${escapeHtml(text)}</div>
      <div class="chapter-rule"></div>
    `;
  } else if (type === 'thinking') {
    el.className += ' thinking-msg';
    el.id = 'thinkingMsg';
    el.innerHTML = `<div class="msg-body"><em>The Dungeon Master is writing your fate<span class="thinking-dots"></span></em></div>`;
  }

  area.appendChild(el);
  if (type === 'dm') {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    area.scrollTop = area.scrollHeight;
  }
  return el;
}

export function removeThinkingMessage() {
  const el = document.getElementById('thinkingMsg');
  if (el) el.remove();
}

// ── Tab Switching ──────────────────────────────────────────────────────────

export function initTabs() {
  const tabs = ['journal', 'loot', 'lore'];
  for (const tab of tabs) {
    const btn = document.getElementById(`tab${capitalize(tab)}`);
    if (btn) {
      btn.addEventListener('click', () => switchTab(tab));
    }
  }
}

export function switchTab(tab) {
  const tabs = ['journal', 'loot', 'lore'];
  for (const t of tabs) {
    const btn     = document.getElementById(`tab${capitalize(t)}`);
    const content = document.getElementById(`${t}Tab`);
    if (btn)     btn.classList.toggle('active', t === tab);
    if (content) { content.style.display = t === tab ? 'block' : 'none'; content.classList.toggle('active', t === tab); }
  }
}

// ── Map Modal ──────────────────────────────────────────────────────────────

export function openMapModal(worldSvg, locationSvg, defaultTab = 'world') {
  const modal   = document.getElementById('mapModal');
  const content = document.getElementById('mapModalContent');
  const legend  = document.getElementById('mapLegend');
  const worldTab    = document.getElementById('worldMapTab');
  const locationTab = document.getElementById('locationMapTab');

  function showWorld() {
    content.innerHTML = worldSvg || '<p style="color:var(--parchment-mute);padding:20px;font-style:italic">Map not yet generated.</p>';
    worldTab.classList.add('active');
    locationTab.classList.remove('active');
    legend.innerHTML = renderMapLegend();
  }

  function showLocation() {
    content.innerHTML = locationSvg || '<p style="color:var(--parchment-mute);padding:20px;font-style:italic">Location map not yet generated.</p>';
    locationTab.classList.add('active');
    worldTab.classList.remove('active');
    legend.innerHTML = '';
  }

  worldTab.onclick    = showWorld;
  locationTab.onclick = showLocation;

  if (defaultTab === 'world') showWorld();
  else showLocation();

  modal.style.display = 'flex';

  document.getElementById('closeMapModal').onclick = () => {
    modal.style.display = 'none';
  };
}

function renderMapLegend() {
  const items = [
    { symbol: '●', label: 'City/Town' },
    { symbol: '■', label: 'Village' },
    { symbol: '×', label: 'Ruins' },
    { symbol: '☠', label: 'Dungeon' },
    { symbol: '★', label: 'Current Location' },
  ];
  return items.map(i =>
    `<div class="legend-item"><span style="color:var(--gold)">${i.symbol}</span> ${i.label}</div>`
  ).join('');
}

// ── API Key Modal ──────────────────────────────────────────────────────────

export function showApiKeyModal(onSave) {
  const modal  = document.getElementById('apiKeyModal');
  const input  = document.getElementById('apiKeyInput');
  const budgetInput = document.getElementById('budgetInput');
  const saveBtn = document.getElementById('saveApiKey');
  const closeBtn = document.getElementById('closeSettings');
  const providerSelect = document.getElementById('providerSelect');
  const modelSelect = document.getElementById('modelSelect');
  const keyLabel = document.getElementById('apiKeyLabel');
  const hintUrl = document.getElementById('apiKeyHintUrl');

  // Populate provider dropdown (mark which have saved keys)
  providerSelect.innerHTML = '';
  for (const [id, prov] of Object.entries(PROVIDERS)) {
    const opt = document.createElement('option');
    opt.value = id;
    const hasKey = !!getProviderApiKey(id);
    opt.textContent = hasKey ? `${prov.name} (key saved)` : prov.name;
    providerSelect.appendChild(opt);
  }
  providerSelect.value = getSelectedProvider();

  function updateForProvider(providerId) {
    const prov = PROVIDERS[providerId];
    if (!prov) return;

    // Update model dropdown
    modelSelect.innerHTML = '';
    const effectiveModel = getEffectiveModel(providerId);
    for (const m of prov.models) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.label}  ($${m.inputPer1M}/$${m.outputPer1M} per MTok)`;
      modelSelect.appendChild(opt);
    }
    modelSelect.value = effectiveModel;

    // Update key label, placeholder, hint
    if (keyLabel) keyLabel.textContent = `${prov.name} API Key`;
    if (hintUrl) hintUrl.textContent = prov.keyUrl.replace(/^https?:\/\//, '');

    // Show asterisks if key exists, otherwise show placeholder
    const existingKey = getProviderApiKey(providerId);
    input.placeholder = prov.keyPlaceholder;
    if (existingKey) {
      input.value = '••••••••••••••••';
      input.dataset.masked = 'true';
    } else {
      input.value = '';
      input.dataset.masked = '';
    }
  }

  // Clear asterisks on focus so user can type a real key
  input.onfocus = () => {
    if (input.dataset.masked === 'true') {
      input.value = '';
      input.dataset.masked = '';
    }
  };

  providerSelect.onchange = () => updateForProvider(providerSelect.value);
  updateForProvider(getSelectedProvider());

  const existingKey = getApiKey();
  const keyRequired = !existingKey;
  modal.dataset.required = keyRequired ? 'true' : '';

  // Hide close button when a key is required (first-time setup)
  if (closeBtn) closeBtn.style.display = keyRequired ? 'none' : '';
  if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };

  // Populate budget input with current value
  const { budget } = getBudgetState();
  if (budgetInput) budgetInput.value = budget > 0 ? budget : '';

  modal.style.display = 'flex';
  input.focus();

  // Block backdrop clicks when key is required
  modal.onclick = (e) => {
    if (e.target === modal && !keyRequired) {
      modal.style.display = 'none';
    }
  };

  saveBtn.onclick = () => {
    const providerId = providerSelect.value;
    const modelId = modelSelect.value;
    const raw = input.value.trim();
    const isStillMasked = input.dataset.masked === 'true';
    const key = isStillMasked ? '' : raw;
    const provExistingKey = getProviderApiKey(providerId);
    const effectiveKey = key.length > 10 ? key : provExistingKey;

    if (!effectiveKey) {
      input.style.borderColor = 'var(--blood-light)';
      input.focus();
      setTimeout(() => { input.style.borderColor = ''; }, 1500);
      return;
    }

    // Persist provider, model, and key
    setSelectedProvider(providerId);
    setSelectedModel(modelId);
    if (key.length > 10) setProviderApiKey(providerId, key);

    // Save budget if provided
    if (budgetInput) {
      const val = parseFloat(budgetInput.value);
      setBudget(val > 0 ? val : 0);
      renderBudgetDisplay(document.getElementById('budgetDisplay'));
    }

    modal.dataset.required = '';
    modal.style.display = 'none';
    onSave(effectiveKey);
  };

  input.onkeydown = (e) => {
    if (e.key === 'Enter') saveBtn.click();
  };
}

export function isApiKeyModalRequired() {
  return document.getElementById('apiKeyModal')?.dataset.required === 'true';
}

// ── Help Modal ─────────────────────────────────────────────────────────────

let manualHtml = null;

export async function openHelpModal() {
  const container = document.getElementById('helpContent');
  if (!manualHtml) {
    try {
      const resp = await fetch('manual.md');
      const md = await resp.text();
      manualHtml = renderManualMarkdown(md);
    } catch {
      manualHtml = '<p>Could not load manual.</p>';
    }
  }
  container.innerHTML = manualHtml;
  document.getElementById('helpModal').style.display = 'flex';
}

export function closeHelpModal() {
  document.getElementById('helpModal').style.display = 'none';
}

// ── Load Save Modal ──────────────────────────────────────────────────────────

export async function showLoadModal(onLoad) {
  // Try native file picker first (Save As / Open dialog — user picks location)
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Elder Realm Save', accept: { 'application/json': ['.json'] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.gameState || !data.version) {
        alert('Invalid save file. This doesn\'t look like an Elder Realm save.');
        return;
      }
      onLoad(data);
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // user cancelled
      console.warn('Open picker failed, falling back to modal:', e);
    }
  }

  // Fallback: modal with file input
  const modal = document.getElementById('loadModal');
  const fileInput = document.getElementById('loadFileInput');
  const info = document.getElementById('loadFileInfo');
  const confirmBtn = document.getElementById('confirmLoad');
  const cancelBtn = document.getElementById('cancelLoad');
  const closeBtn = document.getElementById('closeLoadModal');

  let parsedData = null;

  // Reset state
  fileInput.value = '';
  info.innerHTML = '';
  info.classList.remove('active');
  confirmBtn.disabled = true;

  function close() { modal.style.display = 'none'; }

  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.gameState || !data.version) {
          info.innerHTML = '<strong>Invalid save file.</strong> This doesn\'t look like an Elder Realm save.';
          info.classList.add('active');
          confirmBtn.disabled = true;
          parsedData = null;
          return;
        }
        parsedData = data;
        const date = data.savedAt ? new Date(data.savedAt).toLocaleString() : 'Unknown';
        info.innerHTML = `
          <strong>${data.worldName || 'Unknown World'}</strong><br>
          Turn ${data.turnNumber || '?'} &middot; Saved ${date}
        `;
        info.classList.add('active');
        confirmBtn.disabled = false;
      } catch {
        info.innerHTML = '<strong>Error:</strong> Could not read file. Make sure it\'s a valid .json save.';
        info.classList.add('active');
        confirmBtn.disabled = true;
        parsedData = null;
      }
    };
    reader.readAsText(file);
  };

  confirmBtn.onclick = () => {
    if (!parsedData) return;
    close();
    onLoad(parsedData);
  };

  cancelBtn.onclick = close;
  closeBtn.onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.style.display = 'flex';
}

export function closeLoadModal() {
  document.getElementById('loadModal').style.display = 'none';
}

function renderManualMarkdown(md) {
  // Escape HTML first
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Tables: convert markdown tables to HTML
  html = html.replace(/((?:^\|.+\|$\n?)+)/gm, (tableBlock) => {
    const rows = tableBlock.trim().split('\n');
    if (rows.length < 2) return tableBlock;
    const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim());
    const headers = parseRow(rows[0]);
    // Skip separator row (row[1])
    const bodyRows = rows.slice(2);
    let t = '<table class="help-table"><thead><tr>';
    for (const h of headers) t += `<th>${h}</th>`;
    t += '</tr></thead><tbody>';
    for (const row of bodyRows) {
      const cells = parseRow(row);
      t += '<tr>';
      for (const c of cells) t += `<td>${c}</td>`;
      t += '</tr>';
    }
    t += '</tbody></table>';
    return t;
  });

  // Process line by line
  html = html
    .split('\n')
    .map(line => {
      if (line.startsWith('#### ')) return `<h5 class="md-h4">${line.slice(5)}</h5>`;
      if (line.startsWith('### '))  return `<h4 class="md-h3">${line.slice(4)}</h4>`;
      if (line.startsWith('## '))   return `<h3 class="md-h2">${line.slice(3)}</h3>`;
      if (line.startsWith('# '))    return `<h2 class="md-h1">${line.slice(2)}</h2>`;
      if (line.match(/^---+$/))     return '<hr class="md-rule">';
      if (line.startsWith('- '))    return `<li>${line.slice(2)}</li>`;
      if (line.startsWith('<'))     return line; // already HTML (table)
      if (line.trim() === '')       return '';
      return `<p>${line}</p>`;
    })
    .join('\n');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Inline formatting
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/<p>\s*<\/p>/g, '');

  return html;
}

// ── Input Controls ─────────────────────────────────────────────────────────

export function setInputEnabled(enabled) {
  const input   = document.getElementById('playerInput');
  const sendBtn = document.getElementById('sendBtn');
  if (input)   { input.disabled   = !enabled; }
  if (sendBtn) { sendBtn.disabled = !enabled; }
}

export function clearInput() {
  const input = document.getElementById('playerInput');
  if (input) { input.value = ''; input.style.height = 'auto'; }
}

export function getInputValue() {
  return document.getElementById('playerInput')?.value?.trim() || '';
}

// ── Location Display ───────────────────────────────────────────────────────

export function updateLocationDisplay(location, weather) {
  const locEl = document.getElementById('locationDisplay');
  const weatEl = document.getElementById('weatherDisplay');
  if (locEl) locEl.textContent = location;
  if (weatEl && weather) weatEl.textContent = `· ${weather}`;
}

export function updateWorldName(name) {
  const el = document.getElementById('worldNameDisplay');
  if (el) el.textContent = name;
}

// ── Mini Map ───────────────────────────────────────────────────────────────

export function renderMiniMap(svgContent, locationName) {
  const container = document.getElementById('miniMapSvg');
  const title     = document.getElementById('miniMapTitle');
  if (container) container.innerHTML = svgContent;
  if (title)     title.textContent   = locationName || 'Current Location';
}

// ── XP / Level Up Notification ─────────────────────────────────────────────

export function showLevelUp(name, level) {
  addNarrativeMessage('system', `✨ ${name} has reached Level ${level}! Power flows through your veins.`);
}

export function showXPGained(amount) {
  addNarrativeMessage('system', `<em>+${amount} XP gained.</em>`);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(text) {
  const safe = escapeHtml(text);
  return safe
    .split('\n')
    .map(line => {
      // Headings
      if (line.match(/^### /))  return `<h4 class="md-h3">${line.slice(4)}</h4>`;
      if (line.match(/^## /))   return `<h3 class="md-h2">${line.slice(3)}</h3>`;
      if (line.match(/^# /))    return `<h3 class="md-h1">${line.slice(2)}</h3>`;
      // Horizontal rule
      if (line.match(/^---+$/)) return '<hr class="md-rule">';
      return `<p>${line}</p>`;
    })
    .join('\n')
    // Bold then italic (order matters)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Remove empty paragraphs
    .replace(/<p>\s*<\/p>/g, '');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
