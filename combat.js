// combat.js — Combat tracker, enemy HP, initiative

let combatState = {
  active: false,
  round: 1,
  enemies: [],       // [{ name, hp, maxHp }]
};

export function getCombatState() { return combatState; }

export function activateCombat(enemies) {
  combatState.active = true;
  combatState.enemies = enemies.map(e => ({ ...e }));
}

export function deactivateCombat() {
  combatState.active = false;
  combatState.round = 1;
  combatState.enemies = [];
}

export function updateEnemies(enemies) {
  // Merge new enemy data
  for (const newEnemy of enemies) {
    const existing = combatState.enemies.find(e => e.name === newEnemy.name);
    if (existing) {
      existing.hp = newEnemy.hp;
      existing.maxHp = newEnemy.maxHp;
    } else {
      combatState.enemies.push({ ...newEnemy });
    }
  }
  // Mark defeated
  for (const e of combatState.enemies) {
    if (e.hp <= 0) e.hp = 0;
  }
}

export function incrementRound() {
  combatState.round++;
}

export function processCombatGameState(gs) {
  if (!gs || !gs.combat) return;

  if (gs.combat.active) {
    if (!combatState.active) {
      activateCombat(gs.combat.enemies || []);
    } else {
      if (gs.combat.enemies) updateEnemies(gs.combat.enemies);
      incrementRound();
    }
  } else if (gs.combat.active === false) {
    deactivateCombat();
  }
}

export function renderCombatOverlay(overlay, enemyList, roundDisplay) {
  if (!combatState.active) {
    overlay.style.display = 'none';
    return;
  }

  overlay.style.display = 'block';
  roundDisplay.textContent = `Round ${combatState.round}`;

  enemyList.innerHTML = '';
  for (const enemy of combatState.enemies) {
    const pct = enemy.maxHp > 0 ? Math.max(0, enemy.hp / enemy.maxHp) : 0;
    const defeated = enemy.hp <= 0;

    const card = document.createElement('div');
    card.className = `enemy-card${defeated ? ' defeated' : ''}`;

    card.innerHTML = `
      <div class="enemy-name">${enemy.name}${defeated ? ' — Defeated' : ''}</div>
      <div class="enemy-hp-wrap">
        <div class="enemy-hp-bg">
          <div class="enemy-hp-fill" style="width:${(pct*100).toFixed(1)}%"></div>
        </div>
        <span class="enemy-hp-text">${enemy.hp}/${enemy.maxHp}</span>
      </div>
    `;

    if (!defeated) {
      card.style.animation = 'enemyHit 0.3s ease';
      setTimeout(() => { card.style.animation = ''; }, 300);
    }

    enemyList.appendChild(card);
  }
}
