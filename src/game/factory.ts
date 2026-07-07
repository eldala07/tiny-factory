import {
  DIRECTION_VECTORS,
  GRID_COLUMNS,
  GRID_ROWS,
} from './constants';
import type { Building, Direction, Position } from './types';

export function cellKey(position: Position) {
  return `${position.x},${position.y}`;
}

export function isInsideGrid(position: Position) {
  return (
    position.x >= 0 &&
    position.x < GRID_COLUMNS &&
    position.y >= 0 &&
    position.y < GRID_ROWS
  );
}

export function getNextPosition(position: Position, direction: Direction): Position {
  const vector = DIRECTION_VECTORS[direction];
  return {
    x: position.x + vector.x,
    y: position.y + vector.y,
  };
}

export function getBuildingAt(buildings: Building[], position: Position) {
  return buildings.find((building) => building.x === position.x && building.y === position.y);
}

export function canReceiveOre(buildings: Building[], position: Position) {
  if (!isInsideGrid(position)) {
    return false;
  }

  const building = getBuildingAt(buildings, position);
  return building?.type === 'conveyor' || building?.type === 'seller';
}

export function rotateDirection(direction: Direction): Direction {
  if (direction === 'up') return 'right';
  if (direction === 'right') return 'down';
  if (direction === 'down') return 'left';
  return 'up';
}
