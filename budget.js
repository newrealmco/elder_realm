// budget.js — Token usage tracking and budget management

import { getModelPricing, getSelectedProvider, getEffectiveModel } from './providers.js';

const STORAGE_KEY = 'chronicles_budget';

function defaultBudget() {
  return { totalBudget: 0, totalSpent: 0, totalInputTokens: 0, totalOutputTokens: 0 };
}

export function loadBudget() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBudget();
    return { ...defaultBudget(), ...JSON.parse(raw) };
  } catch {
    return defaultBudget();
  }
}

export function saveBudget(budget) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
}

export function recordUsage(inputTokens, outputTokens) {
  const providerId = getSelectedProvider();
  const modelId = getEffectiveModel(providerId);
  const pricing = getModelPricing(providerId, modelId);
  const budget = loadBudget();
  budget.totalInputTokens  += inputTokens;
  budget.totalOutputTokens += outputTokens;
  budget.totalSpent += inputTokens * pricing.inputPerToken + outputTokens * pricing.outputPerToken;
  saveBudget(budget);
}

export function getBudgetState() {
  const b = loadBudget();
  return {
    budget:       b.totalBudget,
    spent:        b.totalSpent,
    remaining:    b.totalBudget > 0 ? Math.max(0, b.totalBudget - b.totalSpent) : null,
    inputTokens:  b.totalInputTokens,
    outputTokens: b.totalOutputTokens,
  };
}

export function setBudget(amount) {
  const budget = loadBudget();
  budget.totalBudget = amount;
  saveBudget(budget);
}

export function renderBudgetDisplay(container) {
  if (!container) return;
  const { budget, spent } = getBudgetState();
  const spentStr = '$' + spent.toFixed(2);
  const budgetStr = budget > 0 ? '$' + budget.toFixed(2) : '$--';
  container.textContent = `${spentStr} / ${budgetStr}`;
}
