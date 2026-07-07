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
  amount: number;
};

export type Hazard = Position & {
  id: string;
  severity: number;
};

export type Toast = {
  id: string;
  message: string;
};

export type GameStats = {
  itemsSold: number;
  shiftsCleared: number;
};

export type ShiftState = {
  number: number;
  timeLeft: number;
  quota: number;
  soldThisShift: number;
  failures: number;
};

export type SavedGame = {
  coins: number;
  stats: GameStats;
  buildings: Building[];
  shift: ShiftState;
};
