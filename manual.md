# Chronicles of the Elder Realm — User Manual

## What Is This Game?

Chronicles of the Elder Realm is a solo high-fantasy text adventure inspired by classic D&D 5th Edition. An AI Dungeon Master narrates your story in vivid Tolkien-style prose, responding to your choices, tracking your party, and running combat encounters — all in your browser.

You control one hero and three AI-generated companions. Every choice you make shapes the story. There is no predetermined plot — the adventure is uniquely yours.

---

## Getting Started

### 1. Configure Your AI Provider

Before playing, you need an API key from one of the supported AI providers:

| Provider | Get a Key | Key Format |
|----------|-----------|------------|
| **Anthropic** (Claude) | console.anthropic.com | `sk-ant-...` |
| **OpenAI** (GPT) | platform.openai.com/api-keys | `sk-...` |
| **Google Gemini** | aistudio.google.com/app/apikey | `AIza...` |
| **xAI** (Grok) | console.x.ai | `xai-...` |

Click the **Settings** button (gear icon) to open the settings panel. From there:

- **AI Provider** — Choose which AI service to use
- **Model** — Pick a model. Each shows its price per million tokens (input/output). Cheaper models are faster but less creative; expensive models produce richer narratives.
- **API Key** — Paste your key. If a key is already saved, you'll see dots in the field. Click into the field to replace it with a new key.
- **Session Budget** — Optionally set a dollar limit to track spending

You can save keys for multiple providers. Switch between them anytime without losing your keys — the dropdown shows "(key saved)" next to configured providers.

### 2. Create Your Character

Click **Begin Your Legend** on the title screen. You'll choose:

- **Name** — Your hero's name (at least 2 characters)
- **Race** — Human, Elf, Dwarf, Halfling, Orc, Tiefling, or Dragonborn
- **Class** — Ranger, Wizard, Paladin, Rogue, Barbarian, Cleric, Bard, or Warlock
- **Gender** — Male, Female, or Non-binary

Three companions are randomly generated for you. Click **Re-roll Fate** to get different companions if you'd like.

### 3. Begin the Adventure

Click **Begin the Adventure** and the Dungeon Master will set the opening scene. From here, the story is in your hands.

---

## Playing the Game

### Taking Actions

Type what you want to do in the text box at the bottom and press **Enter** (or click **Send**). You can write anything:

- *"I draw my sword and approach the cave entrance cautiously"*
- *"Ask the innkeeper about the rumors of dragons in the north"*
- *"Search the room for hidden passages"*
- *"Cast Fireball at the group of goblins"*

The Dungeon Master will narrate the outcome and present you with **quick action buttons** — suggested next moves you can click instead of typing.

### Dice Rolling

The dice tray sits above the text input. Click any die to roll it:

- **D4, D6, D8, D10, D12, D20** — Standard D&D dice

**How dice work in the game:**
- When the DM needs you to make a check, save, or attack roll, they'll tell you which die to roll (e.g., "Roll d20 for a Perception check")
- Roll the die by clicking it, then send your action — your roll is automatically included in the message
- The DM honors your rolls using D&D 5e rules (d20 + modifier vs difficulty)
- **Natural 20** = Critical hit (double damage dice)
- **Natural 1 on d20** = Fumble

You can roll multiple dice before sending — all pending rolls are included.

### The Party Panel

The left sidebar shows your party of four. Each card displays:

- **Name and gender symbol** (star marks the player character)
- **Race, class, and level**
- **HP bar** — Green when healthy, yellow when wounded, red when critical
- **Stats** — STR, DEX, CON, INT, WIS, CHA (standard D&D ability scores)
- **Conditions** — Any active effects like Poisoned or Blessed

### The Journal (Right Panel)

Three tabs on the right track your progress:

- **Journal** — Quest entries and objectives the DM creates as the story progresses
- **Loot** — Items your party has found or been given
- **Lore** — World history, legends, and notes discovered during your adventure

### Maps

- **World Map** — Click the map button in the top bar (or press **M**). Shows your procedurally generated world with cities, villages, ruins, and dungeons. A blue pulsing marker shows your current location. Visited locations appear as faded blue dots.
- **Location Map** — A detailed map of your current area (dungeon, tavern, forest, castle, town, or wilderness). Updates as you travel.

### Combat

When combat begins, a red overlay appears at the top of the narrative area showing:

- Enemy names and HP bars
- Current combat round

The DM manages combat turns. They'll prompt you for attack rolls and damage dice. Roll the appropriate die, then describe your action.

---

## Settings and Configuration

Open settings anytime by clicking the **gear icon** in the top bar, or from the title screen.

### Switching AI Providers Mid-Game

You can change your AI provider or model at any time — even mid-adventure. Your story, party, and game state are all saved locally and work with any provider.

### Budget Tracking

The top bar shows your spending: `$0.12 / $5.00` (spent / budget). This tracks token usage based on your selected model's pricing. Set a budget in Settings to monitor costs.

### Saving Your Story

- **Auto-save** — The game saves to your browser's local storage after every turn. Close and reopen the browser — your adventure persists.
- **Save Story** — Click the save button in the top bar to download your full narrative as a `story.md` markdown file.
- **Resume** — When you return, click **Resume Saved Journey** on the title screen.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Send your action |
| **Shift+Enter** | New line in the text box |
| **Escape** | Close any open modal |
| **M** | Open the world map |
| **J** | Switch to Journal tab |
| **L** | Switch to Loot tab |
| **K** | Switch to Lore tab |

---

## Tips for a Great Adventure

- **Be specific** — "I sneak behind the guard and pick his pocket" gives the DM more to work with than "I do something sneaky"
- **Use your companions** — Mention them by name. "Tell Lyra to cast Detect Magic" or "Have Grimjaw hold the door"
- **Roll when asked** — The DM will tell you when a dice roll is needed. Don't forget to roll before sending!
- **Check your journal** — Quest entries help you remember what you're doing and where you're headed
- **Explore freely** — There are no wrong answers. The DM adapts to whatever you do
- **Try different providers** — Each AI has a slightly different narrative style. Experiment to find your favorite Dungeon Master
