# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chronicles of the Elder Realm is a solo high-fantasy D&D 5e text adventure with a multi-provider AI Dungeon Master. It's a browser-based game with no build step, no dependencies, and no framework — pure vanilla JS (ES modules), HTML, and CSS.

The player controls one hero with three AI-generated companions. AI provider APIs (Anthropic, OpenAI, Gemini, xAI) are called directly from the browser via `fetch()`. Game state and a running narrative log are persisted to `localStorage`.

## Running the App

```bash
npx serve .
# or
python3 -m http.server 3000
```

Then open `http://localhost:3000`. ES modules require a server — `file://` won't work.

An API key for at least one provider is required at runtime (entered in-app, stored in `localStorage`).

## Architecture

There is no build system, bundler, or package manager. All JS files are ES modules loaded via `<script type="module" src="main.js">` in `index.html`.

### Module Dependency Graph

```
index.html
  └── main.js  (orchestration, game state, boot, turn loop, save/load)
        ├── api.js        (AI API calls via providers.js, system prompt, GAMESTATE parser)
        ├── providers.js  (provider registry: Anthropic, OpenAI, Gemini, xAI — models, pricing, adapters)
        ├── characters.js (character creation, stats, HP, XP, leveling)
        ├── story.js      (story.md read/write in localStorage)
        ├── ui.js         (DOM rendering, modals, tabs, narrative area, load modal)
        ├── dice.js       (dice panel, SVG shapes, roll animations, pending rolls queue)
        ├── maps.js       (procedural SVG world + location map generation)
        ├── combat.js     (combat state tracker, enemy HP overlay)
        ├── inventory.js  (item management, icon mapping, rendering)
        ├── journal.js    (quest log, lore entries)
        └── budget.js     (token usage tracking, dynamic pricing via providers.js)
```

### Key Data Flow: The Turn Loop

1. Player types action → `main.js:sendAction()` prepends any pending dice rolls, sends to `api.js:callDM()`
2. `callDM()` builds a system prompt, gets the active provider/model from `providers.js`, calls `provider.buildRequest()` then `fetch()`, normalizes with `provider.parseResponse()`
3. The DM response contains narrative prose plus an optional `[GAMESTATE:{...}]` JSON block
4. `api.js:parseGameState()` extracts the JSON; `main.js:processGameState()` applies changes (HP, items, location, quests, combat, XP, weather)
5. Quick actions (`→ [Action text]`) are parsed and rendered as clickable buttons
6. State is saved to `localStorage` and all panels re-render

### Multi-Provider System

`providers.js` is the central registry. Each provider has `buildRequest(apiKey, model, systemPrompt, messages)` → `{url, headers, body}` and `parseResponse(data)` → `{text, usage}`. Per-provider API keys are stored as `chronicles_apikey_{provider}`. Legacy key migration (from `chronicles_api_key` to `chronicles_apikey_anthropic`) runs on load.

### GAMESTATE Protocol

The DM embeds structured game changes in responses using `[GAMESTATE:{...}]` — a JSON block with optional fields: `hpChanges`, `newItems`, `removedItems`, `newLocation`, `newQuestEntry`, `combat`, `loreNote`, `chapterTitle`, `xpGained`, `weatherChange`, `worldEvent`. This is defined in `api.js:buildSystemPrompt()`.

**Important regex:** `\[?GAMESTATE:\s*(\{[\s\S]*\})\s*\]?` — brackets and space after colon are optional because DMs sometimes omit them.

### State Persistence

All game state is in `localStorage` under `chronicles_*` keys:
- `chronicles_game_state` — party, world, turn number, maps, visited locations
- `chronicles_conversation` — rolling chat history (last 16 messages)
- `chronicles_story_md` — the narrative log (injected into prompts, capped at 4000 chars)
- `chronicles_inventory`, `chronicles_quest_entries`, `chronicles_lore_entries`
- `chronicles_provider` — active AI provider ID
- `chronicles_model` — active model ID
- `chronicles_apikey_{provider}` — per-provider API keys
- `chronicles_budget` — spending tracker

### Save/Load System

- **Auto-save:** `saveAll()` writes all state to localStorage after every turn
- **Export:** `exportSave()` bundles all localStorage data into a single `.json` file download
- **Import:** `importSave(data)` restores a `.json` save into localStorage and calls `resumeGame()`
- **Story export:** `downloadStory()` downloads a readable `.md` narrative keepsake (separate from save)

### Map Generation

`maps.js` uses seeded RNG (LCG) to procedurally generate SVG maps. World maps are seeded by world name (deterministic per world). Location maps are seeded by location name and rendered as one of 6 types: dungeon, tavern, forest, castle, town, wilderness. Party position and visited locations are shown on the world map.

### API Configuration

- Provider/model configured in-app via Settings modal
- Max tokens: 700 (defined in `providers.js`)
- Anthropic uses `anthropic-dangerous-direct-browser-access` header for browser-side API calls

### Security

- **XSS prevention:** All AI-generated content (DM responses, GAMESTATE values, enemy names, item names, quest text) is escaped via `escapeHtml()` before DOM insertion. System messages allow only `<em>` and `<strong>` tags via `sanitizeSystemHtml()`. Player names are stripped of HTML tags on input.
- **CSP:** `index.html` includes a Content-Security-Policy meta tag restricting script-src to 'self', connect-src to AI API endpoints only, and frame-ancestors to 'self'.
- **API keys:** Stored per-provider in localStorage. Gemini key sent via `x-goog-api-key` header (not URL query param). Keys are never logged or sent to any server other than the provider's API.
- **Save file validation:** Import validates structure (required fields, types, arrays), enforces 5 MB size limit.

### Memory Management

- **Narrative DOM cap:** Max 200 message nodes; oldest removed when limit reached.
- **Starfield animation:** `requestAnimationFrame` loop is stopped when entering the game via the returned stop function.
- **Event listeners:** `wireGameListeners()` guards against duplicate registration across resume cycles.
- **Entry limits:** Quest entries capped at 50, lore entries capped at 50.

## Style / CSS

`style.css` is the single CSS file with all styling. Uses CSS custom properties for theming (dark parchment fantasy aesthetic). Fonts: Cinzel (headings), Crimson Pro (body) via Google Fonts.
