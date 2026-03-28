# Chronicles of the Elder Realm

A solo high-fantasy D&D 5e-inspired text adventure where Claude Sonnet acts as your Dungeon Master.

## Overview

You control one hero in a party of four (three AI companions). The Dungeon Master — powered by the Anthropic API — narrates the world, drives the story, and responds to your every action. A living story file (`story.md`) is maintained across turns, giving the DM persistent memory of your adventure.

Features:
- **AI Dungeon Master** — literary, Tolkien-inspired narration
- **Procedurally generated SVG maps** — unique world and location maps every playthrough
- **Animated dice** — d4 through d20 with 3D roll animations
- **Combat tracker** — enemy HP bars, round counter
- **Quest journal, inventory, lore notes** — right panel tabs
- **Full save/resume** — auto-saved to browser storage

## Setup

1. **Get an Anthropic API key** at [console.anthropic.com](https://console.anthropic.com)

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

## How to Play

- **Type any action** in the input bar and press `Enter` (or click Send)
- **Click quick-action buttons** below DM responses for suggested moves
- **Click dice** in the left panel to roll them
- The DM will respond with narrative prose and update HP, inventory, and quests automatically

### Combat
When enemies appear, a red combat bar appears above the narrative showing enemy HP. Your party's HP is tracked in the left panel.

### Maps
- Click **World Map** in the top bar (or press `M`) to view the procedurally generated world
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

## Saving Your Story

- Your game **auto-saves** to browser `localStorage` on every turn
- Click **Save Story** in the top bar to download `story.md` — a Markdown file containing the full narrative log, quest entries, and world lore
- To resume a saved game, just reload the page and click **Resume Saved Journey**

## Technical Notes

- **No build step required** — pure HTML/CSS/vanilla JS (ES modules)
- **No dependencies** — no npm, no bundler, just a static file server
- The Anthropic API key is stored in `localStorage` — never sent anywhere except Anthropic's servers
- The game uses `fetch()` directly to `api.anthropic.com`
- `story.md` is stored in `localStorage` as `chronicles_story_md`

## Running Without a Server

Some browsers (Chrome especially) block ES module imports from `file://` URLs. You **must** use a local server:

```bash
# Node.js (recommended)
npx serve .

# Python
python3 -m http.server 3000

# Ruby
ruby -run -e httpd . -p 3000
```
