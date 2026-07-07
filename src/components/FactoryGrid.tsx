import type { CSSProperties } from 'react';
import { GRID_COLUMNS, GRID_ROWS } from '../game/constants';
import { cellKey } from '../game/factory';
import type { Building, Direction, Item, Position, SaleParticle, Tool } from '../game/types';

type FactoryGridProps = {
  buildings: Building[];
  items: Item[];
  particles: SaleParticle[];
  selectedTool: Tool;
  conveyorDirection: Direction;
  onCellClick: (position: Position) => void;
};

function getItemPosition(item: Item) {
  return {
    x: item.from.x + (item.to.x - item.from.x) * item.progress + 0.5,
    y: item.from.y + (item.to.y - item.from.y) * item.progress + 0.5,
  };
}

function BuildingTile({ building }: { building: Building }) {
  if (building.type === 'conveyor') {
    return (
      <div className="building conveyor">
        <span className={`arrow ${building.direction}`} />
      </div>
    );
  }

  return <div className={`building ${building.type}`}>{building.type === 'miner' ? 'M' : 'S'}</div>;
}

export function FactoryGrid({
  buildings,
  items,
  particles,
  selectedTool,
  conveyorDirection,
  onCellClick,
}: FactoryGridProps) {
  const buildingMap = new Map(buildings.map((building) => [cellKey(building), building]));
  const cells = Array.from({ length: GRID_COLUMNS * GRID_ROWS }, (_, index) => ({
    x: index % GRID_COLUMNS,
    y: Math.floor(index / GRID_COLUMNS),
  }));

  return (
    <section
      className="factory-board"
      style={{ '--cols': GRID_COLUMNS, '--rows': GRID_ROWS } as CSSProperties}
      aria-label="Factory grid"
    >
      <div className="grid-cells">
        {cells.map((cell) => {
          const building = buildingMap.get(cellKey(cell));

          return (
            <button
              aria-label={`Cell ${cell.x + 1}, ${cell.y + 1}`}
              className={`factory-cell ${building ? 'occupied' : ''} ${selectedTool}`}
              key={cellKey(cell)}
              onClick={() => onCellClick(cell)}
              type="button"
            >
              {building ? <BuildingTile building={building} /> : <span className="placement-ghost">{selectedTool === 'conveyor' ? <span className={`arrow ${conveyorDirection}`} /> : null}</span>}
            </button>
          );
        })}
      </div>

      <div className="item-layer" aria-hidden="true">
        {items.map((item) => {
          const position = getItemPosition(item);

          return (
            <span
              className="ore-item"
              key={item.id}
              style={{
                left: `${(position.x / GRID_COLUMNS) * 100}%`,
                top: `${(position.y / GRID_ROWS) * 100}%`,
              }}
            />
          );
        })}
        {particles.map((particle) => (
          <span
            className="sale-particle"
            key={particle.id}
            style={{
              left: `${((particle.x + 0.5) / GRID_COLUMNS) * 100}%`,
              top: `${((particle.y + 0.5) / GRID_ROWS) * 100}%`,
            }}
          />
        ))}
      </div>
    </section>
  );
}
