import {
  BASE_SHIFT_QUOTA,
  DIRECTIONS,
  SHIFT_DURATION_SECONDS,
  STARTING_COINS,
} from './constants';
import type { Building, BuildingType, Direction, SavedGame, ShiftState } from './types';

const STORAGE_KEY = 'tiny-factory-builder-save';
const buildingTypes: BuildingType[] = ['miner', 'conveyor', 'seller'];

const defaultGame: SavedGame = {
  coins: STARTING_COINS,
  stats: {
    itemsSold: 0,
    shiftsCleared: 0,
  },
  buildings: [],
  shift: {
    number: 1,
    timeLeft: SHIFT_DURATION_SECONDS,
    quota: BASE_SHIFT_QUOTA,
    soldThisShift: 0,
    failures: 0,
  },
};

function cloneDefaultGame(): SavedGame {
  return {
    coins: defaultGame.coins,
    stats: { ...defaultGame.stats },
    buildings: [],
    shift: { ...defaultGame.shift },
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

function isShiftState(value: unknown): value is ShiftState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const shift = value as ShiftState;

  return (
    isFiniteNumber(shift.number) &&
    isFiniteNumber(shift.timeLeft) &&
    isFiniteNumber(shift.quota) &&
    isFiniteNumber(shift.soldThisShift) &&
    isFiniteNumber(shift.failures)
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
        shiftsCleared: Math.max(0, Math.floor(parsed.stats.shiftsCleared ?? 0)),
      },
      buildings: parsed.buildings,
      shift: isShiftState(parsed.shift)
        ? {
            number: Math.max(1, Math.floor(parsed.shift.number)),
            timeLeft: Math.max(0, Math.min(SHIFT_DURATION_SECONDS, parsed.shift.timeLeft)),
            quota: Math.max(1, Math.floor(parsed.shift.quota)),
            soldThisShift: Math.max(0, Math.floor(parsed.shift.soldThisShift)),
            failures: Math.max(0, Math.floor(parsed.shift.failures)),
          }
        : { ...defaultGame.shift },
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
