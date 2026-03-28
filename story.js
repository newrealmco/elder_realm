// story.js — Story file (story.md) read/write via localStorage

const STORY_KEY = 'chronicles_story_md';
const MAX_INJECT_CHARS = 4000;

export function initStory(worldName, party, worldSeed) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const partyLines = party.map(c => {
    const role = c.isPlayer ? 'The player character.' : '';
    return `- **${c.name}** — ${c.race} ${c.cls}, Level ${c.level}. ${role}`;
  }).join('\n');

  const content = `# Chronicles of the Elder Realm

## World: ${worldName}
**Generated:** ${timestamp}
**World Seed:** ${worldSeed}

## The Party
${partyLines}

## Key NPCs

## Places Visited
- ${party[0] ? 'The party begins their journey.' : ''}

## Quest Log

## World Lore

## Story Log

`;
  localStorage.setItem(STORY_KEY, content);
  return content;
}

export function getStory() {
  return localStorage.getItem(STORY_KEY) || '';
}

export function getStoryForPrompt() {
  const full = getStory();
  if (full.length <= MAX_INJECT_CHARS) return full;
  // Inject tail — most recent context
  return '...[earlier story omitted]...\n\n' + full.slice(-MAX_INJECT_CHARS);
}

export function appendTurn({ turn, location, playerAction, dmSummary }) {
  let content = getStory();
  const entry = `\n### Turn ${turn}\n**Location:** ${location}\n**Player:** ${playerAction}\n**DM:** ${dmSummary.slice(0, 300)}\n`;
  content += entry;
  localStorage.setItem(STORY_KEY, content);
}

export function appendQuestEntry(text) {
  let content = getStory();
  content = content.replace('## Quest Log\n', `## Quest Log\n- ${text}\n`);
  localStorage.setItem(STORY_KEY, content);
}

export function appendPlace(location) {
  let content = getStory();
  content = content.replace('## Places Visited\n', `## Places Visited\n- ${location}\n`);
  localStorage.setItem(STORY_KEY, content);
}

export function appendLore(note) {
  let content = getStory();
  content = content.replace('## World Lore\n', `## World Lore\n- ${note}\n`);
  localStorage.setItem(STORY_KEY, content);
}

export function appendNPC(name, description) {
  let content = getStory();
  content = content.replace('## Key NPCs\n', `## Key NPCs\n- **${name}**: ${description}\n`);
  localStorage.setItem(STORY_KEY, content);
}

export function downloadStory(worldName) {
  const content = getStory();
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chronicles-${worldName.toLowerCase().replace(/\s+/g, '-')}-story.md`;
  a.click();
  URL.revokeObjectURL(url);
}
