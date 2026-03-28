# Chronicles of the Elder Realm

A solo high-fantasy D&D 5e-inspired text adventure where AI acts as your Dungeon Master.

## Overview

You control one hero in a party of four (three AI companions). The Dungeon Master — powered by your choice of AI provider — narrates the world, drives the story, and responds to your every action. A living story file is maintained across turns, giving the DM persistent memory of your adventure.

Features:
- **Multi-provider AI Dungeon Master** — Anthropic Claude, OpenAI GPT, Google Gemini, or xAI Grok
- **Model selection** — choose the model that fits your budget and style per provider
- **Procedurally generated SVG maps** — unique world and location maps every playthrough
- **Animated dice** — d4 through d20 integrated into the game loop
- **Combat tracker** — enemy HP bars, round counter
- **Quest journal, inventory, lore notes** — right panel tabs
- **Full save/load** — auto-save to browser storage, plus export/import save files

## Setup

1. **Get an API key** from one of the supported providers:
   - [Anthropic](https://console.anthropic.com/settings/keys) (Claude)
   - [OpenAI](https://platform.openai.com/api-keys) (GPT)
   - [Google](https://aistudio.google.com/app/apikey) (Gemini)
   - [xAI](https://console.x.ai/) (Grok)

2. **Run a local static file server** in this directory:
   ```
   npx serve .
   ```
   Then open `http://localhost:3000` in your browser.

   Alternatively:
   ```
   python3 -m http.server 3000
   ```

3. On first launch, click **Begin Your Legend**, create your character, and enter your API key when prompted.

## Privacy

All API keys and game data are stored **exclusively in your browser's local storage**. Nothing is ever uploaded to any hosting server. Your API key is sent only to your chosen AI provider's API endpoint when generating responses.

## How to Play

- **Type any action** in the input bar and press `Enter` (or click Send)
- **Click quick-action buttons** below DM responses for suggested moves
- **Roll dice** in the tray above the input — the DM will tell you when to roll
- The DM responds with narrative prose and updates HP, inventory, and quests automatically
- Click **?** in the top bar to read the full in-game manual

### Combat
When enemies appear, a red combat bar appears above the narrative showing enemy HP. The DM prompts for attack rolls and damage dice.

### Maps
- Click **World Map** in the top bar (or press `M`) — your party's position and visited locations are shown
- The location map in the lower center panel updates when you travel

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit action |
| `Shift+Enter` | New line in input |
| `Escape` | Close modal |
| `M` | Open map |
| `J` | Journal tab |
| `L` | Loot tab |
| `K` | Lore tab |

## Saving & Loading

- **Auto-save** — your game saves to browser `localStorage` on every turn
- **Save Game** — click in the top bar to download a `.json` save file containing your full game state. Keep multiple saves on your computer.
- **Export Story** — download the narrative log as a `.md` markdown file — a readable keepsake of your adventure
- **Load Save File** — on the title screen, load any previously exported `.json` save
- **Resume** — click **Resume Saved Journey** on the title screen to continue your latest auto-saved game

## Embedding in a Website

The game is a set of static files with no build step. To embed it in an existing site (e.g., Hugo on Netlify):

1. Copy all game files into a directory (e.g., `/static/game/` or a Hugo page's assets)
2. Embed using an `<iframe>`:
   ```html
   <iframe src="/game/index.html" width="100%" height="800" frameborder="0"></iframe>
   ```
3. All data is stored in the browser's `localStorage` scoped to the hosting domain. Users on the same domain share the same localStorage namespace, so the game's save data persists per-domain per-browser.

**Note:** If you move the game to a different domain, `localStorage` data (saves, API keys) does not carry over. Users can export their save as a `.json` file and import it on the new domain.

## Technical Notes

- **No build step required** — pure HTML/CSS/vanilla JS (ES modules)
- **No dependencies** — no npm, no bundler, just a static file server
- API keys are stored per-provider in `localStorage` (e.g., `chronicles_apikey_anthropic`)
- The game calls provider APIs directly from the browser via `fetch()`
- ES modules require a server — `file://` won't work

## License

MIT License. See [LICENSE](LICENSE) for details.
