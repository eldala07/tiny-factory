import type { CSSProperties } from 'react';
import { GRID_COLUMNS, GRID_ROWS } from '../game/constants';
import { cellKey } from '../game/factory';
import type { Building, Direction, Hazard, Item, Position, SaleParticle, Tool } from '../game/types';

type FactoryGridProps = {
  buildings: Building[];
  items: Item[];
  hazards: Hazard[];
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

function DirectionArrow({ direction }: { direction: Direction }) {
  return <span className={`direction-arrow ${direction}`} />;
}

function BuildingTile({ building }: { building: Building }) {
  if (building.type === 'conveyor') {
    return (
      <div className="building conveyor">
        <span className="conveyor-belt" />
        <DirectionArrow direction={building.direction} />
      </div>
    );
  }

  if (building.type === 'seller') {
    return (
      <div className="building seller">
        <span className="seller-window" />
        <span className="seller-coin" />
      </div>
    );
  }

  return (
    <div className="building miner">
      <span className="miner-pick" />
      <span className="miner-gem" />
    </div>
  );
}

function PlacementPreview({ selectedTool, conveyorDirection }: { selectedTool: Tool; conveyorDirection: Direction }) {
  if (selectedTool === 'delete') {
    return <span className="placement-ghost delete-preview" />;
  }

  if (selectedTool === 'conveyor') {
    return (
      <span className="placement-ghost conveyor-preview">
        <DirectionArrow direction={conveyorDirection} />
      </span>
    );
  }

  if (selectedTool === 'seller') {
    return (
      <span className="placement-ghost seller-preview">
        <span className="seller-coin" />
      </span>
    );
  }

  return (
    <span className="placement-ghost miner-preview">
      <span className="miner-pick" />
    </span>
  );
}

export function FactoryGrid({
  buildings,
  items,
  hazards,
  particles,
  selectedTool,
  conveyorDirection,
  onCellClick,
}: FactoryGridProps) {
  const buildingMap = new Map(buildings.map((building) => [cellKey(building), building]));
  const hazardMap = new Map(hazards.map((hazard) => [cellKey(hazard), hazard]));
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
          const hazard = hazardMap.get(cellKey(cell));

          return (
            <button
              aria-label={`Cell ${cell.x + 1}, ${cell.y + 1}`}
              className={`factory-cell ${building ? 'occupied' : ''} ${hazard ? 'shorted' : ''} ${selectedTool}`}
              key={cellKey(cell)}
              onClick={() => onCellClick(cell)}
              type="button"
            >
              {building ? (
                <BuildingTile building={building} />
              ) : hazard ? (
                <span className="hazard-tile">
                  <span />
                </span>
              ) : (
                <PlacementPreview selectedTool={selectedTool} conveyorDirection={conveyorDirection} />
              )}
              {building && hazard ? (
                <span className="hazard-overlay">
                  <span />
                </span>
              ) : null}
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
            >
              <span />
            </span>
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
          >
            <span className="sale-ring" />
            <span className="sale-sparks" />
            <span className="sale-amount">+{particle.amount}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
