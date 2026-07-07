import { DIRECTIONS, STARTING_COINS } from './constants';
import type { Building, BuildingType, Direction, SavedGame } from './types';

const STORAGE_KEY = 'tiny-factory-builder-save';
const buildingTypes: BuildingType[] = ['miner', 'conveyor', 'seller'];

const defaultGame: SavedGame = {
  coins: STARTING_COINS,
  stats: {
    itemsSold: 0,
  },
  buildings: [],
};

function cloneDefaultGame(): SavedGame {
  return {
    coins: defaultGame.coins,
    stats: { ...defaultGame.stats },
    buildings: [],
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isDirection(value: unknown): value is Direction {
  return DIRECTIONS.includes(value as Direction);
}

function isBuildingType(value: unknown): value is BuildingType {
  return buildingTypes.includes(value as BuildingType);
}

function isBuilding(value: unknown): value is Building {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const building = value as Building;

  return (
    typeof building.id === 'string' &&
    isBuildingType(building.type) &&
    isFiniteNumber(building.x) &&
    isFiniteNumber(building.y) &&
    isDirection(building.direction)
  );
}

function isSavedGame(value: unknown): value is SavedGame {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const game = value as SavedGame;
  return (
    isFiniteNumber(game.coins) &&
    Array.isArray(game.buildings) &&
    game.buildings.every(isBuilding) &&
    isFiniteNumber(game.stats?.itemsSold)
  );
}

export function loadGame(): SavedGame {
  try {
    const rawSave = localStorage.getItem(STORAGE_KEY);

    if (!rawSave) {
      return cloneDefaultGame();
    }

    const parsed = JSON.parse(rawSave) as unknown;

    if (!isSavedGame(parsed)) {
      return cloneDefaultGame();
    }

    return {
      coins: Math.max(0, Math.floor(parsed.coins)),
      stats: {
        itemsSold: Math.max(0, Math.floor(parsed.stats.itemsSold)),
      },
      buildings: parsed.buildings,
    };
  } catch {
    return cloneDefaultGame();
  }
}

export function saveGame(game: SavedGame) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch {
    // Saving should never interrupt play, especially in private browsing modes.
  }
}

export function clearSavedGame() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createNewGame(): SavedGame {
  return cloneDefaultGame();
}
