// journal.js — Quest log and lore notes

let questEntries = [];
let loreEntries  = [];

const MAX_QUEST_ENTRIES = 50;

export function getQuestEntries() { return questEntries; }
export function getLoreEntries()  { return loreEntries;  }
export function setQuestEntries(entries) { questEntries = entries; }
export function setLoreEntries(entries)  { loreEntries  = entries; }

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
      <div class="quest-title">${entry.title}</div>
      <div class="quest-text">${entry.text}</div>
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
