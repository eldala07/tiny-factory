import type { BuildingType, Direction, Position } from './types';

export const GRID_COLUMNS = 12;
export const GRID_ROWS = 8;
export const STARTING_COINS = 100;
export const ORE_VALUE = 5;
export const MINER_INTERVAL_SECONDS = 2;
export const ITEM_SPEED_CELLS_PER_SECOND = 2.4;
export const SHIFT_DURATION_SECONDS = 75;
export const BASE_SHIFT_QUOTA = 8;
export const QUOTA_GROWTH_PER_SHIFT = 5;
export const HAZARD_INTERVAL_SECONDS = 16;
export const MAX_HAZARDS = 7;
export const MAX_FAILURES = 3;
export const BASE_POWER_CAPACITY = 18;
export const POWER_CAPACITY_PER_SHIFT = 2;
export const OVERLOAD_SPEED_MULTIPLIER = 0.52;

export const BUILDING_COSTS: Record<BuildingType, number> = {
  miner: 25,
  conveyor: 5,
  seller: 40,
};

export const POWER_COSTS: Record<BuildingType, number> = {
  miner: 4,
  conveyor: 1,
  seller: 3,
};

export const BUILDING_LABELS: Record<BuildingType, string> = {
  miner: 'Miner',
  conveyor: 'Conveyor',
  seller: 'Seller',
};

export const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];

export const DIRECTION_VECTORS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};
