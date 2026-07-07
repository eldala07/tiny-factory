export type Direction = 'up' | 'right' | 'down' | 'left';

export type BuildingType = 'miner' | 'conveyor' | 'seller';

export type Tool = BuildingType | 'delete';

export type Position = {
  x: number;
  y: number;
};

export type Building = Position & {
  id: string;
  type: BuildingType;
  direction: Direction;
};

export type Item = {
  id: string;
  from: Position;
  to: Position;
  progress: number;
};

export type SaleParticle = Position & {
  id: string;
};

export type Toast = {
  id: string;
  message: string;
};

export type GameStats = {
  itemsSold: number;
};

export type SavedGame = {
  coins: number;
  stats: GameStats;
  buildings: Building[];
};
