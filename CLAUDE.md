# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chronicles of the Elder Realm is a solo high-fantasy D&D 5e text adventure where Claude Sonnet acts as the Dungeon Master. It's a browser-based game with no build step, no dependencies, and no framework — pure vanilla JS (ES modules), HTML, and CSS.

The player controls one hero with three AI-generated companions. The Anthropic API is called directly from the browser via `fetch()` to `api.anthropic.com`. Game state and a running `story.md` narrative log are persisted to `localStorage`.

## Running the App

```bash
npx serve .
# or
python3 -m http.server 3000
```

Then open `http://localhost:3000`. ES modules require a server — `file://` won't work.

An Anthropic API key is required at runtime (entered in-app, stored in `localStorage`).

## Architecture

There is no build system, bundler, or package manager. All JS files are ES modules loaded via `<script type="module" src="main.js">` in `index.html`.

### Module Dependency Graph

```
index.html
  └── main.js  (orchestration, game state, boot sequence, turn loop)
        ├── api.js        (Anthropic API calls, system prompt, GAMESTATE parser)
        ├── characters.js (character creation, stats, HP, XP, leveling)
        ├── story.js      (story.md read/write in localStorage)
        ├── ui.js          (DOM rendering, modals, tabs, narrative area)
        ├── dice.js        (dice panel, SVG shapes, roll animations)
        ├── maps.js        (procedural SVG world + location map generation)
        ├── combat.js      (combat state tracker, enemy HP overlay)
        ├── inventory.js   (item management, icon mapping, rendering)
        └── journal.js     (quest log, lore entries)
```

### Key Data Flow: The Turn Loop

1. Player types action → `main.js:sendAction()` sends it to `api.js:callDM()`
2. `callDM()` builds a system prompt (including party stats, story context from localStorage) and calls the Anthropic Messages API
3. The DM response contains narrative prose plus an optional `[GAMESTATE:{...}]` JSON block
4. `api.js:parseGameState()` extracts the JSON; `main.js:processGameState()` applies changes (HP, items, location, quests, combat, XP, weather)
5. Quick actions (`→ [Action text]`) are parsed and rendered as clickable buttons
6. State is saved to `localStorage` and all panels re-render

### GAMESTATE Protocol

The DM embeds structured game changes in responses using `[GAMESTATE:{...}]` — a JSON block with optional fields: `hpChanges`, `newItems`, `removedItems`, `newLocation`, `newQuestEntry`, `combat`, `loreNote`, `chapterTitle`, `xpGained`, `weatherChange`, `worldEvent`. This is defined in `api.js:buildSystemPrompt()`.

### State Persistence

All game state is in `localStorage` under `chronicles_*` keys:
- `chronicles_game_state` — party, world, turn number, maps
- `chronicles_conversation` — rolling chat history (last 40 messages)
- `chronicles_story_md` — the narrative log (injected into prompts, capped at 8000 chars)
- `chronicles_inventory`, `chronicles_quest_entries`, `chronicles_lore_entries`
- `chronicles_api_key`

### Map Generation

`maps.js` uses seeded RNG (LCG) to procedurally generate SVG maps. World maps are seeded by world name (deterministic per world). Location maps are seeded by location name and rendered as one of 6 types: dungeon, tavern, forest, castle, town, wilderness.

### API Configuration

- Model: `claude-sonnet-4-6` (hardcoded in `api.js`)
- Max tokens: 1024
- Uses `anthropic-dangerous-direct-browser-access` header for browser-side API calls

## Style / CSS

`style.css` is a single 28KB file with all styling. Uses CSS custom properties for theming (dark parchment fantasy aesthetic). Fonts: Cinzel (headings), Crimson Pro (body) via Google Fonts.
