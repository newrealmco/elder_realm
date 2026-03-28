// api.js — AI API calls and prompt construction

import { getStoryForPrompt } from './story.js';
import {
  PROVIDERS, getSelectedProvider, getEffectiveModel,
  getProviderApiKey, setProviderApiKey,
} from './providers.js';

export function getApiKey() {
  return getProviderApiKey(getSelectedProvider());
}

export function setApiKey(key) {
  setProviderApiKey(getSelectedProvider(), key);
}

// ── System Prompt Builder ──────────────────────────────────────────────────

export function buildSystemPrompt(gameState) {
  const { worldName, currentLocation, turnNumber, party, weather } = gameState;
  const player = party.find(c => c.isPlayer);

  const partyDesc = party.map(c => {
    const tag = c.isPlayer ? '*' : '';
    const cond = c.conditions.length ? ` [${c.conditions.join(',')}]` : '';
    const gTag = c.gender ? ` ${c.gender[0]}` : '';
    return `${tag}${c.name}(${c.race} ${c.cls} L${c.level}${gTag}) ${c.hp}/${c.hpMax}hp S${c.str} D${c.dex} C${c.con} I${c.int} W${c.wis} Ch${c.cha} ${c.status}${cond}`;
  }).join('\n');

  const storyContent = getStoryForPrompt();

  return `You are DM for a solo D&D 5e high-fantasy game (Tolkien/Howard tradition).

WORLD:${worldName} LOC:${currentLocation} TURN:${turnNumber}${weather ? ` WEATHER:${weather}` : ''}

PARTY (* = player character):
${partyDesc}

STORY SO FAR:
${storyContent}

RULES:
- 150-250 words of vivid Tolkien-style prose. Rich description, named places, weather, sounds, smells.
- Invent memorable NPCs. Drive the story forward with urgency. Reference earlier events.
- Describe combat dramatically. Never break the fourth wall.
- Track all state changes in GAMESTATE block. End with 2-4 specific actions: → [Action text]

DICE:
- The player has a dice tray and can roll d4, d6, d8, d10, d12, d20.
- When the player's message contains [DICE ROLLS: ...], those are real rolls — honor the results to determine success/failure using D&D 5e rules (d20+modifier vs DC).
- When an action requires a check, save, or attack roll, and the player has NOT rolled, tell them what to roll. Example: → [Roll d20 for Perception check] or → [Roll d20 + attack against the goblin]
- In combat, prompt for attack rolls and damage dice. Use party stats to calculate modifiers.
- A natural 20 is a critical hit (double damage dice). A natural 1 on d20 is a fumble.

GAMESTATE: After narrative, if state changed, include exactly one block (all fields optional):
[GAMESTATE:{"hpChanges":{"Name":-5},"newItems":["Sword"],"newLocation":"The Caves"}]
Other optional fields: removedItems, newQuestEntry, combat:{active,enemies:[{name,hp,maxHp}]}, loreNote, chapterTitle, xpGained, worldEvent, weatherChange.
`;
}

// ── GAMESTATE Parser ───────────────────────────────────────────────────────

export function parseGameState(text) {
  const match = text.match(/\[?GAMESTATE:\s*(\{[\s\S]*\})\s*\]?/);
  if (!match) return { clean: text, gs: null };
  const clean = text.replace(/\[?GAMESTATE:\s*\{[\s\S]*\}\s*\]?/, '').trim();
  try {
    const gs = JSON.parse(match[1]);
    return { clean, gs };
  } catch (e) {
    console.warn('GAMESTATE parse failed:', e, match[1]);
    return { clean, gs: null };
  }
}

// ── Quick Actions Parser ───────────────────────────────────────────────────

export function parseQuickActions(text) {
  const actions = [];
  const regex = /→\s*(.+)/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    actions.push(m[1].trim());
  }
  return actions;
}

export function stripQuickActions(text) {
  return text.replace(/→\s*.+/g, '').trim();
}

// ── API Call ───────────────────────────────────────────────────────────────

export async function callDM({ gameState, userMessage, conversationHistory }) {
  const providerId = getSelectedProvider();
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error('UNKNOWN_PROVIDER');

  const apiKey = getProviderApiKey(providerId);
  if (!apiKey) throw new Error('NO_API_KEY');

  const model = getEffectiveModel(providerId);
  const systemPrompt = buildSystemPrompt(gameState);

  // Build messages: rolling history + current user message
  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  const req = provider.buildRequest(apiKey, model, systemPrompt, messages);

  const response = await fetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: req.body,
  });

  if (response.status === 429) throw new Error('RATE_LIMIT');
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API_ERROR:${response.status}:${err}`);
  }

  const data = await response.json();
  return provider.parseResponse(data);
}

// ── Opening Scene ──────────────────────────────────────────────────────────

export function buildOpeningMessage(party, worldName) {
  const player = party.find(c => c.isPlayer);
  const companions = party.filter(c => !c.isPlayer);
  const compList = companions.map(c => `${c.name} (${c.gender || 'Male'} ${c.race} ${c.cls})`).join(', ');

  return `Begin the adventure. Our party has just arrived at the edge of ${worldName}. ` +
    `The player character is ${player.name}, a ${player.gender || 'Male'} ${player.race} ${player.cls}. ` +
    `Their companions are: ${compList}. ` +
    `Set the opening scene with vivid atmosphere, introduce the world and a compelling immediate situation. ` +
    `Give us something urgent to respond to.`;
}
