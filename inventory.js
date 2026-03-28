// inventory.js — Loot system and item management

const ICON_MAP = {
  sword: '⚔️', blade: '⚔️', dagger: '🗡️', knife: '🗡️', bow: '🏹',
  staff: '🪄', wand: '🪄', axe: '🪓', mace: '🔨', spear: '🗡️',
  shield: '🛡️', armor: '🧥', mail: '🧥', helm: '⛑️', helmet: '⛑️',
  boots: '👢', cloak: '🧣', gloves: '🧤', ring: '💍', amulet: '📿',
  potion: '🧪', elixir: '🧪', scroll: '📜', tome: '📖', book: '📖',
  map: '🗺️', gold: '💰', coin: '🪙', coins: '🪙', gem: '💎',
  jewel: '💎', ruby: '💎', emerald: '💎', sapphire: '💎',
  key: '🗝️', torch: '🔦', lantern: '🕯️', rope: '🧶',
  food: '🍖', ration: '🍖', bread: '🍞', meat: '🍖',
  arrow: '🏹', quiver: '🏹',
};

export function getItemIcon(name) {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(keyword)) return icon;
  }
  return '🎒';
}

export function getItemType(name) {
  const lower = name.toLowerCase();
  if (/sword|blade|dagger|bow|axe|mace|staff|spear|wand/.test(lower)) return 'weapon';
  if (/armor|shield|helm|boots|cloak|gloves|mail|plate/.test(lower)) return 'armor';
  if (/potion|elixir|scroll|tome|wand/.test(lower)) return 'consumable';
  if (/quest|key|map|letter|seal|sigil/.test(lower)) return 'quest';
  if (/gold|coin|gem|ruby|emerald|sapphire|jewel|treasure/.test(lower)) return 'treasure';
  return 'misc';
}

let inventory = [];

export function getInventory() { return inventory; }

export function setInventory(items) { inventory = items.map(i => ({...i})); }

export function addItems(names) {
  for (const name of names) {
    const existing = inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      inventory.push({
        name,
        icon: getItemIcon(name),
        qty: 1,
        type: getItemType(name),
        description: '',
      });
    }
  }
}

export function removeItems(names) {
  for (const name of names) {
    const idx = inventory.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
    if (idx !== -1) {
      if (inventory[idx].qty > 1) {
        inventory[idx].qty--;
      } else {
        inventory.splice(idx, 1);
      }
    }
  }
}

export function renderInventory(container) {
  container.innerHTML = '';
  if (inventory.length === 0) {
    container.innerHTML = '<p class="inventory-empty">Your satchel is empty.</p>';
    return;
  }
  for (const item of inventory) {
    const el = document.createElement('div');
    el.className = `inventory-item${item.type === 'quest' ? ' quest-item' : ''}`;
    el.innerHTML = `
      <span class="item-icon">${item.icon}</span>
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-type">${item.type}</div>
      </div>
      <span class="item-qty">×${item.qty || 1}</span>
    `;
    container.appendChild(el);
  }
}
