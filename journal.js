// journal.js — Quest log and lore notes

import { escapeHtml } from './ui.js';

let questEntries = [];
let loreEntries  = [];

const MAX_QUEST_ENTRIES = 50;
const MAX_LORE_ENTRIES  = 50;

export function getQuestEntries() { return questEntries; }
export function getLoreEntries()  { return loreEntries;  }
export function setQuestEntries(entries) { questEntries = entries.slice(0, MAX_QUEST_ENTRIES); }
export function setLoreEntries(entries)  { loreEntries  = entries.slice(0, MAX_LORE_ENTRIES); }

export function addQuestEntry({ turn, location, text }) {
  const entry = {
    id: questEntries.length + 1,
    turn,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    title: `Turn ${turn} · ${location}`,
    text,
    type: detectQuestType(text),
  };
  questEntries.unshift(entry);  // newest first
  if (questEntries.length > MAX_QUEST_ENTRIES) {
    questEntries = questEntries.slice(0, MAX_QUEST_ENTRIES);
  }
}

export function addLoreEntry(text) {
  loreEntries.push({ id: loreEntries.length + 1, text });
  if (loreEntries.length > MAX_LORE_ENTRIES) {
    loreEntries = loreEntries.slice(-MAX_LORE_ENTRIES);
  }
}

function detectQuestType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('discover') || lower.includes('found') || lower.includes('reveal')) return 'discovery';
  if (lower.includes('side') || lower.includes('help') || lower.includes('fetch')) return 'side';
  return 'main';
}

export function renderQuestLog(container) {
  container.innerHTML = '';
  if (questEntries.length === 0) {
    container.innerHTML = '<p class="quest-empty">No entries yet. Your legend begins now.</p>';
    return;
  }
  for (const entry of questEntries) {
    const el = document.createElement('div');
    el.className = 'quest-entry';
    el.innerHTML = `
      <div class="quest-title">${escapeHtml(entry.title)}</div>
      <div class="quest-text">${escapeHtml(entry.text)}</div>
    `;
    container.appendChild(el);
  }
}

export function renderLoreList(container) {
  container.innerHTML = '';
  if (loreEntries.length === 0) {
    container.innerHTML = '<p class="lore-empty">No lore has been uncovered.</p>';
    return;
  }
  for (const entry of loreEntries) {
    const el = document.createElement('div');
    el.className = 'lore-entry';
    el.textContent = entry.text;
    container.appendChild(el);
  }
}
