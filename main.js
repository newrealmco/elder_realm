// main.js — App orchestration, state, boot sequence

import { createCharacter, generateCompanion, applyHpChange, gainXP } from './characters.js';
import { callDM, parseGameState, parseQuickActions, stripQuickActions, buildOpeningMessage, getApiKey, setApiKey } from './api.js';
import { initStory, appendTurn, appendQuestEntry, appendPlace, appendLore, downloadStory } from './story.js';
import { initStarfield, initRunicStrip, initCharGenModal, renderPartyCards, addNarrativeMessage, removeThinkingMessage, initTabs, switchTab, openMapModal, showApiKeyModal, isApiKeyModalRequired, openHelpModal, closeHelpModal, setInputEnabled, clearInput, getInputValue, updateLocationDisplay, updateWorldName, renderMiniMap, showLevelUp, showXPGained } from './ui.js';
import { initDicePanel, rollAndAnimate, getPendingRolls } from './dice.js';
import { generateWorldMap, generateLocationMap } from './maps.js';
import { getCombatState, processCombatGameState, renderCombatOverlay, deactivateCombat } from './combat.js';
import { addItems, removeItems, renderInventory, setInventory, getInventory } from './inventory.js';
import { addQuestEntry, addLoreEntry, renderQuestLog, renderLoreList, setQuestEntries, setLoreEntries, getQuestEntries, getLoreEntries } from './journal.js';
import { recordUsage, renderBudgetDisplay } from './budget.js';

// ── World Name Generation ──────────────────────────────────────────────────

const WORLD_NAMES = [
  'Aethermoor','Valdrath','Neverstone','Ironspire Realm','Duskwood','The Elder Realm',
  'Thornveil','Ashendarr','Grimwatch','The Sunken Lands','Vaeloria','Morrowind',
  'Shadowmere','The Broken Crown','Aldenmoor'
];

function generateWorldName() {
  return WORLD_NAMES[Math.floor(Math.random() * WORLD_NAMES.length)];
}

// ── Game State ─────────────────────────────────────────────────────────────

let gameState = {
  worldName: 'The Elder Realm',
  worldSeed: Math.floor(Math.random() * 99999),
  currentLocation: 'The Road to Adventure',
  weather: '',
  party: [],
  turnNumber: 0,
  conversationHistory: [],
  selectedCharIndex: 0,
  worldMapSvg: '',
  locationMapSvg: '',
  visitedLocations: [],
};

function saveAll() {
  localStorage.setItem('chronicles_game_state',   JSON.stringify(gameState));
  localStorage.setItem('chronicles_conversation',  JSON.stringify(gameState.conversationHistory));
  localStorage.setItem('chronicles_inventory',     JSON.stringify(getInventory()));
  localStorage.setItem('chronicles_quest_entries', JSON.stringify(getQuestEntries()));
  localStorage.setItem('chronicles_lore_entries',  JSON.stringify(getLoreEntries()));
}

function loadSavedState() {
  try {
    const saved = localStorage.getItem('chronicles_game_state');
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    Object.assign(gameState, parsed);

    const conv = localStorage.getItem('chronicles_conversation');
    if (conv) {
      gameState.conversationHistory = JSON.parse(conv).map(msg => {
        if (msg.role === 'assistant') {
          let content = msg.content;
          content = content.replace(/\[?GAMESTATE:\s*\{[\s\S]*\}\s*\]?/, '').trim();
          content = content.replace(/→\s*.+/g, '').trim();
          return { ...msg, content };
        }
        return msg;
      });
    }

    const inv = localStorage.getItem('chronicles_inventory');
    if (inv) setInventory(JSON.parse(inv));

    const qe = localStorage.getItem('chronicles_quest_entries');
    if (qe) setQuestEntries(JSON.parse(qe));

    const le = localStorage.getItem('chronicles_lore_entries');
    if (le) setLoreEntries(JSON.parse(le));

    return true;
  } catch (e) {
    console.warn('Failed to load saved state:', e);
    return false;
  }
}

// ── Turn Loop ──────────────────────────────────────────────────────────────

async function sendAction(text) {
  if (!text.trim()) return;

  const player = gameState.party.find(c => c.isPlayer);
  setInputEnabled(false);
  clearInput();

  // Attach any pending dice rolls to the message
  const rolls = getPendingRolls();
  let userMessage = text;
  if (rolls.length > 0) {
    const rollStr = rolls.map(r => `${r.die.toUpperCase()}: ${r.result}${r.isCrit ? ' (CRITICAL!)' : ''}${r.isFumble ? ' (FUMBLE!)' : ''}`).join(', ');
    userMessage = `[DICE ROLLS: ${rollStr}] ${text}`;
  }

  // Show player message
  addNarrativeMessage('player', text, { playerName: player?.name });

  // Show thinking indicator
  addNarrativeMessage('thinking', '');

  try {
    const { text: rawResponse, usage } = await callDM({
      gameState,
      userMessage,
      conversationHistory: gameState.conversationHistory,
    });

    removeThinkingMessage();

    // Record token usage for budget tracking
    recordUsage(usage.input_tokens, usage.output_tokens);
    renderBudgetDisplay(document.getElementById('budgetDisplay'));

    // Parse GAMESTATE block
    const { clean, gs } = parseGameState(rawResponse);

    // Parse quick actions
    const quickActions = parseQuickActions(clean);
    const narrativeText = stripQuickActions(clean);

    // Process game state changes
    if (gs) await processGameState(gs);

    // Show DM response
    addNarrativeMessage('dm', narrativeText, {
      playerName: player?.name,
      quickActions,
      onAction: (action) => sendAction(action),
    });

    // Update conversation history (keep last 20 turns)
    gameState.conversationHistory.push({ role: 'user', content: text });
    gameState.conversationHistory.push({ role: 'assistant', content: narrativeText });
    if (gameState.conversationHistory.length > 16) {
      gameState.conversationHistory = gameState.conversationHistory.slice(-16);
    }

    // Increment turn
    gameState.turnNumber++;

    // Append to story file
    appendTurn({
      turn: gameState.turnNumber,
      location: gameState.currentLocation,
      playerAction: text,
      dmSummary: narrativeText,
    });

    // Render panels
    renderAll();
    saveAll();

  } catch (err) {
    removeThinkingMessage();
    handleApiError(err);
  } finally {
    setInputEnabled(true);
    document.getElementById('playerInput')?.focus();
  }
}

async function processGameState(gs) {
  if (!gs) return;

  const player = gameState.party.find(c => c.isPlayer);

  // HP changes
  if (gs.hpChanges) {
    for (const [name, delta] of Object.entries(gs.hpChanges)) {
      const char = gameState.party.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (char) {
        applyHpChange(char, delta);
        if (delta < 0) {
          addNarrativeMessage('system', `<em>${char.name} takes ${Math.abs(delta)} damage. (${char.hp}/${char.hpMax} HP)</em>`);
        } else if (delta > 0) {
          addNarrativeMessage('system', `<em>${char.name} heals ${delta} HP. (${char.hp}/${char.hpMax} HP)</em>`);
        }
      }
    }
  }

  // New items
  if (gs.newItems && gs.newItems.length > 0) {
    addItems(gs.newItems);
    addNarrativeMessage('system', `🎒 Added to inventory: ${gs.newItems.join(', ')}`);
  }

  // Removed items
  if (gs.removedItems && gs.removedItems.length > 0) {
    removeItems(gs.removedItems);
  }

  // New location
  if (gs.newLocation && gs.newLocation !== gameState.currentLocation) {
    gameState.currentLocation = gs.newLocation;
    updateLocationDisplay(gs.newLocation, gameState.weather);
    appendPlace(gs.newLocation);
    // Track visited locations
    if (!gameState.visitedLocations) gameState.visitedLocations = [];
    if (!gameState.visitedLocations.includes(gs.newLocation)) {
      gameState.visitedLocations.push(gs.newLocation);
    }
    // Regenerate world map with updated party position
    const { svg } = generateWorldMap(gameState.worldName, gameState.currentLocation, gameState.visitedLocations);
    gameState.worldMapSvg = svg;
    // Generate new location map
    gameState.locationMapSvg = generateLocationMap(gs.newLocation);
    renderMiniMap(gameState.locationMapSvg, gs.newLocation);
  }

  // Quest entry
  if (gs.newQuestEntry) {
    addQuestEntry({
      turn: gameState.turnNumber + 1,
      location: gameState.currentLocation,
      text: gs.newQuestEntry,
    });
    appendQuestEntry(gs.newQuestEntry);
  }

  // Lore note
  if (gs.loreNote) {
    addLoreEntry(gs.loreNote);
    appendLore(gs.loreNote);
  }

  // Chapter title
  if (gs.chapterTitle) {
    addNarrativeMessage('chapter', gs.chapterTitle);
  }

  // XP
  if (gs.xpGained && gs.xpGained > 0) {
    showXPGained(gs.xpGained);
    for (const char of gameState.party) {
      const { leveledUp, newLevel } = gainXP(char, gs.xpGained);
      if (leveledUp) showLevelUp(char.name, newLevel);
    }
  }

  // Weather
  if (gs.weatherChange) {
    gameState.weather = gs.weatherChange;
    updateLocationDisplay(gameState.currentLocation, gs.weatherChange);
  }

  // World event
  if (gs.worldEvent) {
    addNarrativeMessage('system', `⚡ ${gs.worldEvent}`);
  }

  // Combat
  processCombatGameState(gs);
  renderCombatOverlay(
    document.getElementById('combatOverlay'),
    document.getElementById('enemyList'),
    document.getElementById('combatRoundDisplay'),
  );
}

function handleApiError(err) {
  const msg = err.message || '';
  if (msg === 'NO_API_KEY' || msg.startsWith('API_ERROR:401') || msg.startsWith('API_ERROR:403')) {
    // Bad or missing key — clear it and re-prompt
    setApiKey('');
    addNarrativeMessage('system', '⚠️ <em>Your API key is invalid or unauthorized. Please enter a valid key.</em>');
    showApiKeyModal((key) => {
      setApiKey(key);
    });
  } else if (msg.startsWith('API_ERROR:400')) {
    // Could be billing/credit issue or bad key — clear and re-prompt
    setApiKey('');
    addNarrativeMessage('system', '⚠️ <em>Your API key was rejected. Please check your billing or enter a new key in Settings.</em>');
    showApiKeyModal((key) => {
      setApiKey(key);
    });
  } else if (msg === 'RATE_LIMIT') {
    addNarrativeMessage('system', '⌛ <em>The mystical connection is strained... please wait a moment and try again.</em>');
    setTimeout(() => setInputEnabled(true), 5000);
  } else {
    console.error('API Error:', err);
    addNarrativeMessage('system', `⚠️ <em>The arcane connection faltered. (${msg.slice(0, 80)})</em> Please try again.`);
  }
}

// ── Render All Panels ──────────────────────────────────────────────────────

function renderAll() {
  renderPartyCards(
    gameState.party,
    gameState.selectedCharIndex,
    (i) => { gameState.selectedCharIndex = i; renderAll(); }
  );
  renderInventory(document.getElementById('inventoryList'));
  renderQuestLog(document.getElementById('questLog'));
  renderLoreList(document.getElementById('loreList'));
  renderCombatOverlay(
    document.getElementById('combatOverlay'),
    document.getElementById('enemyList'),
    document.getElementById('combatRoundDisplay'),
  );
}

// ── Opening Scene ──────────────────────────────────────────────────────────

async function startOpeningScene() {
  setInputEnabled(false);
  addNarrativeMessage('thinking', '');

  try {
    const openingMsg = buildOpeningMessage(gameState.party, gameState.worldName);

    const { text: rawResponse, usage } = await callDM({
      gameState,
      userMessage: openingMsg,
      conversationHistory: [],
    });

    removeThinkingMessage();

    // Record token usage for budget tracking
    recordUsage(usage.input_tokens, usage.output_tokens);
    renderBudgetDisplay(document.getElementById('budgetDisplay'));

    const { clean, gs } = parseGameState(rawResponse);
    const quickActions = parseQuickActions(clean);
    const narrativeText = stripQuickActions(clean);

    if (gs) await processGameState(gs);

    addNarrativeMessage('chapter', 'Chapter I: The Adventure Begins');
    addNarrativeMessage('dm', narrativeText, {
      quickActions,
      onAction: (action) => sendAction(action),
    });

    gameState.conversationHistory.push({ role: 'user', content: openingMsg });
    gameState.conversationHistory.push({ role: 'assistant', content: narrativeText });

    gameState.turnNumber = 1;
    renderAll();
    saveAll();
  } catch (err) {
    removeThinkingMessage();
    handleApiError(err);
  } finally {
    setInputEnabled(true);
    document.getElementById('playerInput')?.focus();
  }
}

// ── Boot Sequence ──────────────────────────────────────────────────────────

async function boot() {
  // Title screen animations
  initStarfield();
  initRunicStrip();

  // Check for saved game — show resume button alongside begin
  const hasSaved = localStorage.getItem('chronicles_game_state') !== null;
  if (hasSaved) {
    const resumeBtn = document.getElementById('resumeGame');
    if (resumeBtn) resumeBtn.style.display = '';
  }

  document.getElementById('resumeGame')?.addEventListener('click', resumeGame);

  document.getElementById('beginBtn')?.addEventListener('click', startNewGame);

  // Title screen settings button
  document.getElementById('titleSettingsBtn')?.addEventListener('click', () => {
    showApiKeyModal((key) => setApiKey(key));
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleGlobalKey);
}

function requireApiKey(callback) {
  if (!getApiKey()) {
    showApiKeyModal((key) => {
      setApiKey(key);
      callback();
    });
    return;
  }
  callback();
}

function showCharGen() {
  requireApiKey(() => {
    document.getElementById('titleScreen').style.display = 'none';
    initCharGenModal(onCharGenComplete);
  });
}

function startNewGame() {
  // Clear saved state
  localStorage.removeItem('chronicles_game_state');
  localStorage.removeItem('chronicles_conversation');
  localStorage.removeItem('chronicles_story_md');
  localStorage.removeItem('chronicles_inventory');
  localStorage.removeItem('chronicles_quest_entries');
  localStorage.removeItem('chronicles_lore_entries');
  showCharGen();
}

async function onCharGenComplete({ name, race, cls, gender, companions }) {
  // Create player character
  const player = createCharacter({ name, race, cls, gender, isPlayer: true });
  gameState.party = [player, ...companions];
  gameState.worldName = generateWorldName();
  gameState.worldSeed = Math.floor(Math.random() * 99999);
  gameState.currentLocation = 'The Road to Adventure';

  requireApiKey(() => launchGame());
}

async function launchGame() {
  if (!getApiKey()) return; // Safety net — should never reach here without a key
  // Init story file
  initStory(gameState.worldName, gameState.party, gameState.worldSeed);

  // Show game layout
  document.getElementById('titleScreen').style.display = 'none';
  document.getElementById('gameLayout').style.display  = 'flex';

  // Set world name display
  updateWorldName(gameState.worldName);
  updateLocationDisplay(gameState.currentLocation, '');

  // Generate world map
  if (!gameState.visitedLocations) gameState.visitedLocations = [];
  const { svg } = generateWorldMap(gameState.worldName, gameState.currentLocation, gameState.visitedLocations);
  gameState.worldMapSvg = svg;

  // Generate initial location map
  gameState.locationMapSvg = generateLocationMap(gameState.currentLocation);
  renderMiniMap(gameState.locationMapSvg, gameState.currentLocation);

  // Init dice panel
  initDicePanel(
    document.getElementById('diceButtons'),
    document.getElementById('diceHistory'),
    ({ die, result, isCrit, isFumble }) => {
      if (isCrit)   addNarrativeMessage('system', `⚡ <strong>Critical!</strong> ${result} on the ${die.toUpperCase()}. Fortune smiles upon you!`);
      if (isFumble) addNarrativeMessage('system', `💀 A 1. The gods are cruel today.`);
    }
  );

  // Init tabs
  initTabs();

  // Wire input
  const input   = document.getElementById('playerInput');
  const sendBtn = document.getElementById('sendBtn');

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const val = getInputValue();
      if (val) sendAction(val);
    }
  });

  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 80) + 'px';
  });

  sendBtn?.addEventListener('click', () => {
    const val = getInputValue();
    if (val) sendAction(val);
  });

  // Top bar buttons
  document.getElementById('worldMapBtn')?.addEventListener('click', () => {
    openMapModal(gameState.worldMapSvg, gameState.locationMapSvg, 'world');
  });
  document.getElementById('expandMapBtn')?.addEventListener('click', () => {
    openMapModal(gameState.worldMapSvg, gameState.locationMapSvg, 'location');
  });
  document.getElementById('saveStoryBtn')?.addEventListener('click', () => {
    downloadStory(gameState.worldName);
  });
  document.getElementById('helpBtn')?.addEventListener('click', openHelpModal);
  document.getElementById('closeHelp')?.addEventListener('click', closeHelpModal);
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    showApiKeyModal((key) => setApiKey(key));
  });
  document.getElementById('mainMenuBtn')?.addEventListener('click', returnToTitle);

  // Map modal close on backdrop click
  document.getElementById('mapModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('mapModal')) {
      document.getElementById('mapModal').style.display = 'none';
    }
  });
  document.getElementById('helpModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('helpModal')) closeHelpModal();
  });

  // Render initial party
  renderAll();

  // Render budget display
  renderBudgetDisplay(document.getElementById('budgetDisplay'));

  // Welcome message
  addNarrativeMessage('system', `<em>Welcome to ${gameState.worldName}. Your legend begins...</em>`);

  // Start opening scene
  await startOpeningScene();
}

async function resumeGame() {
  const loaded = loadSavedState();
  if (!loaded) { startNewGame(); return; }
  requireApiKey(() => resumeGameLayout());
}

function resumeGameLayout() {
  if (!getApiKey()) return; // Safety net
  document.getElementById('titleScreen').style.display = 'none';
  document.getElementById('gameLayout').style.display  = 'flex';

  updateWorldName(gameState.worldName);
  updateLocationDisplay(gameState.currentLocation, gameState.weather);

  // Re-generate maps from saved data (always regenerate to show current position)
  if (!gameState.visitedLocations) gameState.visitedLocations = [];
  const { svg } = generateWorldMap(gameState.worldName, gameState.currentLocation, gameState.visitedLocations);
  gameState.worldMapSvg = svg;
  if (!gameState.locationMapSvg) {
    gameState.locationMapSvg = generateLocationMap(gameState.currentLocation);
  }
  renderMiniMap(gameState.locationMapSvg, gameState.currentLocation);

  // Init dice panel
  initDicePanel(
    document.getElementById('diceButtons'),
    document.getElementById('diceHistory'),
    ({ die, result, isCrit, isFumble }) => {
      if (isCrit)   addNarrativeMessage('system', `⚡ <strong>Critical!</strong> ${result} on the ${die.toUpperCase()}. Fortune smiles upon you!`);
      if (isFumble) addNarrativeMessage('system', `💀 A 1. The gods are cruel today.`);
    }
  );

  initTabs();

  const input   = document.getElementById('playerInput');
  const sendBtn = document.getElementById('sendBtn');

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const val = getInputValue();
      if (val) sendAction(val);
    }
  });

  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 80) + 'px';
  });

  sendBtn?.addEventListener('click', () => {
    const val = getInputValue();
    if (val) sendAction(val);
  });

  document.getElementById('worldMapBtn')?.addEventListener('click', () => {
    openMapModal(gameState.worldMapSvg, gameState.locationMapSvg, 'world');
  });
  document.getElementById('expandMapBtn')?.addEventListener('click', () => {
    openMapModal(gameState.worldMapSvg, gameState.locationMapSvg, 'location');
  });
  document.getElementById('saveStoryBtn')?.addEventListener('click', () => {
    downloadStory(gameState.worldName);
  });
  document.getElementById('helpBtn')?.addEventListener('click', openHelpModal);
  document.getElementById('closeHelp')?.addEventListener('click', closeHelpModal);
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    showApiKeyModal((key) => setApiKey(key));
  });
  document.getElementById('mainMenuBtn')?.addEventListener('click', returnToTitle);
  document.getElementById('mapModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('mapModal')) {
      document.getElementById('mapModal').style.display = 'none';
    }
  });
  document.getElementById('helpModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('helpModal')) closeHelpModal();
  });

  renderAll();

  // Render budget display
  renderBudgetDisplay(document.getElementById('budgetDisplay'));

  // Restore conversation history
  const playerName = gameState.party.find(c => c.isPlayer)?.name || 'Hero';
  for (const msg of gameState.conversationHistory) {
    if (msg.role === 'user') {
      addNarrativeMessage('player', msg.content, { playerName });
    } else if (msg.role === 'assistant') {
      addNarrativeMessage('dm', msg.content);
    }
  }

  addNarrativeMessage('system', `<em>Resuming your journey in ${gameState.worldName}...</em>`);
  addNarrativeMessage('system', `<em>You find yourself at ${gameState.currentLocation}. What do you do?</em>`);

  setInputEnabled(true);
  input?.focus();
}

function handleGlobalKey(e) {
  // Don't trigger if typing in input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    if (e.key === 'Escape') {
      // Never dismiss the API key modal via Escape if a key is required
      if (!isApiKeyModalRequired()) {
        closeAllModals();
      }
    }
    return;
  }

  switch (e.key) {
    case 'Escape':
      if (!isApiKeyModalRequired()) closeAllModals();
      break;
    case 'm': case 'M':
      if (gameState.party.length > 0) openMapModal(gameState.worldMapSvg, gameState.locationMapSvg, 'world');
      break;
    case 'j': case 'J': switchTab('journal'); break;
    case 'l': case 'L': switchTab('loot');    break;
    case 'k': case 'K': switchTab('lore');    break;
  }
}

function returnToTitle() {
  saveAll();
  closeAllModals();
  document.getElementById('gameLayout').style.display = 'none';
  document.getElementById('titleScreen').style.display = 'flex';
  // Update resume button visibility since we now have a saved game
  const resumeBtn = document.getElementById('resumeGame');
  if (resumeBtn) resumeBtn.style.display = '';
}

function closeAllModals() {
  document.getElementById('mapModal').style.display  = 'none';
  document.getElementById('helpModal').style.display = 'none';
  // Don't dismiss the API key modal if a key is required
  if (!isApiKeyModalRequired()) {
    document.getElementById('apiKeyModal').style.display = 'none';
  }
}

// ── Start ──────────────────────────────────────────────────────────────────

boot();
