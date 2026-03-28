// characters.js — Character generation and stat logic

export const RACES = ['Human','Elf','Dwarf','Halfling','Half-Orc','Tiefling','Gnome','Dragonborn'];

export const CLASSES = [
  'Fighter','Wizard','Rogue','Cleric','Ranger',
  'Paladin','Bard','Druid','Sorcerer','Warlock'
];

export const GENDERS = ['Male','Female','Non-binary'];
export const GENDER_SYMBOL = { Male: '♂', Female: '♀', 'Non-binary': '⚧' };

export const CLASS_EMOJI = {
  Fighter:  '⚔️',
  Wizard:   '🔮',
  Rogue:    '🗡️',
  Cleric:   '✝️',
  Ranger:   '🏹',
  Paladin:  '🛡️',
  Bard:     '🎶',
  Druid:    '🌿',
  Sorcerer: '✨',
  Warlock:  '👁️',
};

// Fantasy name tables for AI companion generation
const NAME_PREFIXES = [
  'Ael','Aer','Ara','Bal','Bran','Cal','Dor','El','Era','Far',
  'Gar','Gil','Hal','Ith','Kael','Kor','Lir','Mal','Mor','Nev',
  'Orin','Per','Quen','Ral','Sil','Tal','Thor','Ul','Val','Wren',
  'Xan','Yon','Zar','Ash','Bryn','Cael','Dwyn','Eld','Finn','Gael'
];

const NAME_SUFFIXES = [
  'ador','aena','aith','alith','amon','anar','and','ane','anor',
  'ar','ard','aren','aric','arin','arion','as','ath','avir',
  'dor','dran','dril','el','en','eon','eth','evar','ian','iel',
  'in','ion','ir','iren','is','ith','ius','on','or','orn','oth',
  'ri','rian','rin','ron','sar','sen','sor','thar','thas','win'
];

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function randomFrom(arr, rand) {
  return arr[Math.floor(rand() * arr.length)];
}

export function generateFantasyName(seed) {
  const r = rng(seed || Math.floor(Math.random() * 99999));
  const prefix = randomFrom(NAME_PREFIXES, r);
  const suffix = randomFrom(NAME_SUFFIXES, r);
  return prefix + suffix;
}

function roll(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollStat() {
  const rolls = [roll(6), roll(6), roll(6), roll(6)];
  return rolls.sort((a, b) => a - b).slice(1).reduce((a, b) => a + b, 0);
}

export function rollStats() {
  let stats;
  do {
    stats = {
      str: rollStat(),
      dex: rollStat(),
      con: rollStat(),
      int: rollStat(),
      wis: rollStat(),
      cha: rollStat(),
    };
  } while (stats.str + stats.dex + stats.con + stats.int + stats.wis + stats.cha < 60);
  // Ensure no stat below 8
  for (const key of Object.keys(stats)) {
    if (stats[key] < 8) stats[key] = 8;
  }
  return stats;
}

export function statMod(stat) {
  return Math.floor((stat - 10) / 2);
}

export function calcHpMax(con, level = 1) {
  return 8 + statMod(con) + (level - 1) * (5 + statMod(con));
}

export function calcAC(dex) {
  return 10 + statMod(dex);
}

export function getStatus(hp, hpMax) {
  if (hp <= -10) return 'dead';
  if (hp <= 0)   return 'unconscious';
  const pct = hp / hpMax;
  if (pct <= 0.29) return 'critical';
  if (pct <= 0.59) return 'wounded';
  return 'active';
}

export function getHpBarGradient(hp, hpMax) {
  const pct = hpMax > 0 ? hp / hpMax : 0;
  if (pct <= 0) return 'linear-gradient(90deg, #444, #555)';
  if (pct < 0.3) return 'linear-gradient(90deg, #8b1a1a, #c44)';
  if (pct < 0.6) return 'linear-gradient(90deg, #7a5a00, #c4a000)';
  return 'linear-gradient(90deg, #1a5f1a, #3a9a3a)';
}

export function createCharacter({ name, race, cls, gender, isPlayer = false, level = 1 }) {
  const stats = rollStats();
  const hpMax = calcHpMax(stats.con, level);
  return {
    name,
    race,
    cls,
    gender: gender || 'Male',
    isPlayer,
    level,
    xp: 0,
    ...stats,
    hp: hpMax,
    hpMax,
    ac: calcAC(stats.dex),
    initiative: statMod(stats.dex),
    status: 'active',
    conditions: [],
    emoji: CLASS_EMOJI[cls] || '⚔️',
    background: '',
  };
}

export function generateCompanion(index) {
  const seed = Date.now() + index * 7919;
  const r = rng(seed);
  const name = generateFantasyName(Math.floor(r() * 99999));
  const race = randomFrom(RACES, r);
  const cls  = randomFrom(CLASSES, r);
  const gender = randomFrom(GENDERS, r);
  return createCharacter({ name, race, cls, gender, isPlayer: false });
}

export function applyHpChange(character, delta) {
  const newHp = Math.min(character.hpMax, character.hp + delta);
  character.hp = newHp;
  character.status = getStatus(character.hp, character.hpMax);
  return character;
}

export function gainXP(character, amount) {
  character.xp += amount;
  // Simple level thresholds
  const thresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000];
  let newLevel = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (character.xp >= thresholds[i]) { newLevel = i + 1; break; }
  }
  if (newLevel > character.level) {
    character.level = newLevel;
    const newHpMax = calcHpMax(character.con, character.level);
    const hpGain = newHpMax - character.hpMax;
    character.hpMax = newHpMax;
    character.hp = Math.min(character.hp + hpGain, character.hpMax);
    return { leveledUp: true, newLevel };
  }
  return { leveledUp: false };
}
