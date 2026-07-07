import { STARTING_COINS } from './constants';
import type { Building, SavedGame } from './types';

const STORAGE_KEY = 'tiny-factory-builder-save';

const defaultGame: SavedGame = {
  coins: STARTING_COINS,
  stats: {
    itemsSold: 0,
  },
  buildings: [],
};

function isSavedGame(value: unknown): value is SavedGame {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const game = value as SavedGame;
  return (
    typeof game.coins === 'number' &&
    Array.isArray(game.buildings) &&
    typeof game.stats?.itemsSold === 'number'
  );
}

export function loadGame(): SavedGame {
  try {
    const rawSave = localStorage.getItem(STORAGE_KEY);

    if (!rawSave) {
      return defaultGame;
    }

    const parsed = JSON.parse(rawSave) as unknown;

    if (!isSavedGame(parsed)) {
      return defaultGame;
    }

    return {
      coins: parsed.coins,
      stats: parsed.stats,
      buildings: parsed.buildings as Building[],
    };
  } catch {
    return defaultGame;
  }
}

export function saveGame(game: SavedGame) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

export function clearSavedGame() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createNewGame(): SavedGame {
  return defaultGame;
}
