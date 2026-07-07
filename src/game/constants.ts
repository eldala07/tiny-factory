import type { BuildingType, Direction, Position } from './types';

export const GRID_COLUMNS = 12;
export const GRID_ROWS = 8;
export const STARTING_COINS = 100;
export const ORE_VALUE = 5;
export const MINER_INTERVAL_SECONDS = 2;
export const ITEM_SPEED_CELLS_PER_SECOND = 2.4;

export const BUILDING_COSTS: Record<BuildingType, number> = {
  miner: 25,
  conveyor: 5,
  seller: 40,
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
