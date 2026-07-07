import { BUILDING_COSTS, BUILDING_LABELS, POWER_COSTS } from '../game/constants';
import type { BuildingType, Direction, Tool } from '../game/types';

type ToolbarProps = {
  coins: number;
  selectedTool: Tool;
  conveyorDirection: Direction;
  onSelectTool: (tool: Tool) => void;
  onRotate: () => void;
  onReset: () => void;
};

const buildingTypes: BuildingType[] = ['miner', 'conveyor', 'seller'];

function ToolIcon({ type, direction }: { type: BuildingType; direction: Direction }) {
  if (type === 'conveyor') {
    return (
      <span className="tool-icon conveyor">
        <span className={`direction-arrow ${direction}`} />
      </span>
    );
  }

  if (type === 'seller') {
    return (
      <span className="tool-icon seller">
        <span className="seller-coin" />
      </span>
    );
  }

  return (
    <span className="tool-icon miner">
      <span className="miner-pick" />
    </span>
  );
}

export function Toolbar({
  coins,
  selectedTool,
  conveyorDirection,
  onSelectTool,
  onRotate,
  onReset,
}: ToolbarProps) {
  return (
    <aside className="toolbar" aria-label="Build toolbar">
      <div className="panel-title">
        <span>Build</span>
        <strong>{selectedTool === 'delete' ? 'Remove' : BUILDING_LABELS[selectedTool]}</strong>
      </div>

      <div className="tool-list">
        {buildingTypes.map((type) => {
          const cost = BUILDING_COSTS[type];
          const isSelected = selectedTool === type;
          const isLocked = coins < cost;

          return (
            <button
              className={`tool-button ${isSelected ? 'selected' : ''}`}
              disabled={isLocked}
              key={type}
              onClick={() => onSelectTool(type)}
              type="button"
            >
              <ToolIcon type={type} direction={conveyorDirection} />
              <span>
                <strong>{BUILDING_LABELS[type]}</strong>
                <small>
                  {cost} coins · {POWER_COSTS[type]} power
                </small>
              </span>
            </button>
          );
        })}
      </div>

      <button className="secondary-button" onClick={onRotate} type="button">
        Rotate conveyor: {conveyorDirection}
      </button>

      <button
        className={`secondary-button danger ${selectedTool === 'delete' ? 'selected' : ''}`}
        onClick={() => onSelectTool('delete')}
        type="button"
      >
        Delete / clear faults
      </button>

      <button className="reset-button" onClick={onReset} type="button">
        Reset factory
      </button>
    </aside>
  );
}
