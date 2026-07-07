import { useCallback, useEffect, useRef, useState } from 'react';
import { FactoryGrid } from './components/FactoryGrid';
import { Header } from './components/Header';
import { HelpPanel } from './components/HelpPanel';
import { ToastStack } from './components/ToastStack';
import { Toolbar } from './components/Toolbar';
import {
  BASE_POWER_CAPACITY,
  BASE_SHIFT_QUOTA,
  BUILDING_COSTS,
  GRID_COLUMNS,
  GRID_ROWS,
  HAZARD_INTERVAL_SECONDS,
  ITEM_SPEED_CELLS_PER_SECOND,
  MAX_FAILURES,
  MAX_HAZARDS,
  MINER_INTERVAL_SECONDS,
  ORE_VALUE,
  OVERLOAD_SPEED_MULTIPLIER,
  POWER_CAPACITY_PER_SHIFT,
  POWER_COSTS,
  QUOTA_GROWTH_PER_SHIFT,
  SHIFT_DURATION_SECONDS,
} from './game/constants';
import {
  cellKey,
  getBuildingAt,
  getNextPosition,
  rotateDirection,
} from './game/factory';
import { clearSavedGame, createNewGame, loadGame, saveGame } from './game/storage';
import type {
  Building,
  Direction,
  GameStats,
  Hazard,
  Item,
  Position,
  SaleParticle,
  ShiftState,
  Toast,
  Tool,
} from './game/types';

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isSamePosition(a: Position, b: Position) {
  return a.x === b.x && a.y === b.y;
}

function createBuilding(type: Exclude<Tool, 'delete'>, position: Position, direction: Direction): Building {
  return {
    id: createId(type),
    type,
    x: position.x,
    y: position.y,
    direction: type === 'conveyor' ? direction : 'right',
  };
}

function getQuotaForShift(shiftNumber: number) {
  return BASE_SHIFT_QUOTA + (shiftNumber - 1) * QUOTA_GROWTH_PER_SHIFT;
}

function createShiftState(shiftNumber: number, failures = 0): ShiftState {
  return {
    number: shiftNumber,
    timeLeft: SHIFT_DURATION_SECONDS,
    quota: getQuotaForShift(shiftNumber),
    soldThisShift: 0,
    failures,
  };
}

function getPowerUsage(buildings: Building[]) {
  return buildings.reduce((total, building) => total + POWER_COSTS[building.type], 0);
}

function getPowerCapacity(shiftNumber: number) {
  return BASE_POWER_CAPACITY + (shiftNumber - 1) * POWER_CAPACITY_PER_SHIFT;
}

function getSpeedMultiplier(powerUsed: number, powerCapacity: number) {
  return powerUsed > powerCapacity ? OVERLOAD_SPEED_MULTIPLIER : 1;
}

function getHazardAt(hazards: Hazard[], position: Position) {
  return hazards.find((hazard) => hazard.x === position.x && hazard.y === position.y);
}

function canReceiveOreWithHazards(buildings: Building[], hazards: Hazard[], position: Position) {
  const building = getBuildingAt(buildings, position);

  return !getHazardAt(hazards, position) && (building?.type === 'conveyor' || building?.type === 'seller');
}

function createStuckItem(item: Item, position: Position): Item {
  return {
    ...item,
    from: position,
    to: position,
    progress: 0,
  };
}

function getMovingItem(item: Item, buildings: Building[], hazards: Hazard[]): Item | null {
  if (getHazardAt(hazards, item.to)) {
    return createStuckItem(item, item.to);
  }

  const building = getBuildingAt(buildings, item.to);

  if (!building) {
    return null;
  }

  if (building.type === 'seller') {
    return item;
  }

  if (building.type !== 'conveyor') {
    return null;
  }

  const nextPosition = getNextPosition(item.to, building.direction);

  if (!canReceiveOreWithHazards(buildings, hazards, nextPosition)) {
    return createStuckItem(item, item.to);
  }

  return {
    ...item,
    from: item.to,
    to: nextPosition,
    progress: 0,
  };
}

function updateItemRoute(item: Item, buildings: Building[], hazards: Hazard[], deltaSeconds: number) {
  if (isSamePosition(item.from, item.to)) {
    return getMovingItem(item, buildings, hazards);
  }

  return {
    ...item,
    progress: item.progress + deltaSeconds * ITEM_SPEED_CELLS_PER_SECOND,
  };
}

type AdvancedItem = {
  item: Item | null;
  soldAt: Position | null;
};

function advanceItem(item: Item, buildings: Building[], hazards: Hazard[], deltaSeconds: number): AdvancedItem {
  let updatedItem = updateItemRoute(item, buildings, hazards, deltaSeconds);

  while (updatedItem && !isSamePosition(updatedItem.from, updatedItem.to) && updatedItem.progress >= 1) {
    const arrival = updatedItem.to;
    const overflowProgress = updatedItem.progress - 1;
    const arrivalBuilding = getBuildingAt(buildings, arrival);

    if (arrivalBuilding?.type === 'seller') {
      return { item: null, soldAt: arrival };
    }

    updatedItem = getMovingItem(
      {
        ...updatedItem,
        from: arrival,
        to: arrival,
        progress: 0,
      },
      buildings,
      hazards,
    );

    if (updatedItem && !isSamePosition(updatedItem.from, updatedItem.to)) {
      updatedItem = {
        ...updatedItem,
        progress: overflowProgress,
      };
    }
  }

  return { item: updatedItem, soldAt: null };
}

function countRecentSales(saleTimes: number[]) {
  const cutoff = Date.now() - 60_000;
  return saleTimes.filter((time) => time >= cutoff);
}

function pickHazardPosition(buildings: Building[], hazards: Hazard[]): Position | null {
  const hazardKeys = new Set(hazards.map(cellKey));
  const weightedCells: Position[] = [];

  for (const building of buildings) {
    if (building.type === 'seller' || hazardKeys.has(cellKey(building))) {
      continue;
    }

    weightedCells.push(building, building);
  }

  for (let y = 0; y < GRID_ROWS; y += 1) {
    for (let x = 0; x < GRID_COLUMNS; x += 1) {
      const position = { x, y };

      if (!hazardKeys.has(cellKey(position)) && !getBuildingAt(buildings, position)) {
        weightedCells.push(position);
      }
    }
  }

  if (weightedCells.length === 0) {
    return null;
  }

  return weightedCells[Math.floor(Math.random() * weightedCells.length)];
}

function createHazard(position: Position): Hazard {
  return {
    id: createId('hazard'),
    x: position.x,
    y: position.y,
    severity: 1,
  };
}

function removeRandomConveyors(buildings: Building[], amount: number) {
  const conveyorIds = buildings
    .filter((building) => building.type === 'conveyor')
    .sort(() => Math.random() - 0.5)
    .slice(0, amount)
    .map((building) => building.id);
  const removedIds = new Set(conveyorIds);

  return buildings.filter((building) => !removedIds.has(building.id));
}

export default function App() {
  const [initialGame] = useState(loadGame);
  const [coins, setCoins] = useState(initialGame.coins);
  const [stats, setStats] = useState<GameStats>(initialGame.stats);
  const [shift, setShift] = useState<ShiftState>(initialGame.shift);
  const [buildings, setBuildings] = useState<Building[]>(initialGame.buildings);
  const [items, setItems] = useState<Item[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [particles, setParticles] = useState<SaleParticle[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool>('miner');
  const [conveyorDirection, setConveyorDirection] = useState<Direction>('right');
  const [productionRate, setProductionRate] = useState(0);
  const [coinPulseKey, setCoinPulseKey] = useState(0);

  const buildingsRef = useRef(buildings);
  const hazardsRef = useRef(hazards);
  const shiftRef = useRef(shift);
  const minerTimersRef = useRef<Record<string, number>>({});
  const hazardTimerRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const saleTimesRef = useRef<number[]>([]);

  const showToast = useCallback((message: string) => {
    const toast = { id: createId('toast'), message };

    setToasts((current) => [...current.slice(-2), toast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== toast.id));
    }, 2200);
  }, []);

  const rotateConveyor = useCallback(() => {
    setConveyorDirection((current) => rotateDirection(current));
  }, []);

  useEffect(() => {
    buildingsRef.current = buildings;
    const buildingIds = new Set(buildings.map((building) => building.id));

    for (const timerId of Object.keys(minerTimersRef.current)) {
      if (!buildingIds.has(timerId)) {
        delete minerTimersRef.current[timerId];
      }
    }
  }, [buildings]);

  useEffect(() => {
    hazardsRef.current = hazards;
  }, [hazards]);

  useEffect(() => {
    shiftRef.current = shift;
  }, [shift]);

  useEffect(() => {
    saveGame({ coins, stats, buildings, shift });
  }, [buildings, coins, shift.failures, shift.number, shift.quota, shift.soldThisShift, stats]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r') {
        rotateConveyor();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotateConveyor]);

  useEffect(() => {
    const shiftTimer = window.setInterval(() => {
      const currentShift = shiftRef.current;
      const nextTimeLeft = currentShift.timeLeft - 0.25;

      if (nextTimeLeft > 0) {
        const nextShift = { ...currentShift, timeLeft: nextTimeLeft };
        shiftRef.current = nextShift;
        setShift(nextShift);
        return;
      }

      if (currentShift.soldThisShift >= currentShift.quota) {
        const nextShiftNumber = currentShift.number + 1;
        const bonus = 25 + currentShift.number * 10;
        const nextShift = createShiftState(nextShiftNumber, currentShift.failures);

        shiftRef.current = nextShift;
        setShift(nextShift);
        setStats((current) => ({ ...current, shiftsCleared: current.shiftsCleared + 1 }));
        setCoins((current) => current + bonus);
        setCoinPulseKey((current) => current + 1);
        setHazards((current) => current.slice(0, Math.max(0, current.length - 2)));
        showToast(`Shift cleared +${bonus}`);
        return;
      }

      const nextFailures = currentShift.failures + 1;
      const didMeltdown = nextFailures >= MAX_FAILURES;
      const penalty = 20 + currentShift.number * 8;
      const nextShift = createShiftState(Math.max(1, currentShift.number - (didMeltdown ? 1 : 0)), didMeltdown ? 0 : nextFailures);

      shiftRef.current = nextShift;
      setShift(nextShift);
      setCoins((current) => Math.max(0, current - penalty));
      setItems([]);

      if (didMeltdown) {
        setBuildings((current) => removeRandomConveyors(current, 4));
        setHazards([]);
        showToast('Audit crash: conveyors stripped');
        return;
      }

      setHazards((current) => {
        const newHazards = [...current];

        for (let index = 0; index < 2; index += 1) {
          const position = pickHazardPosition(buildingsRef.current, newHazards);

          if (position) {
            newHazards.push(createHazard(position));
          }
        }

        return newHazards.slice(-MAX_HAZARDS);
      });
      showToast(`Quota missed -${penalty}`);
    }, 250);

    return () => window.clearInterval(shiftTimer);
  }, [showToast]);

  useEffect(() => {
    const tick = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }

      const deltaSeconds = Math.min((timestamp - lastFrameTimeRef.current) / 1000, 0.08);
      lastFrameTimeRef.current = timestamp;
      const currentBuildings = buildingsRef.current;
      const currentHazards = hazardsRef.current;
      const currentShift = shiftRef.current;
      const powerUsed = getPowerUsage(currentBuildings);
      const powerCapacity = getPowerCapacity(currentShift.number);
      const speedMultiplier = getSpeedMultiplier(powerUsed, powerCapacity);
      const effectiveDeltaSeconds = deltaSeconds * speedMultiplier;

      hazardTimerRef.current += deltaSeconds;

      if (
        hazardTimerRef.current >= Math.max(7, HAZARD_INTERVAL_SECONDS - currentShift.number) &&
        currentHazards.length < MAX_HAZARDS &&
        currentShift.timeLeft < SHIFT_DURATION_SECONDS - 5
      ) {
        hazardTimerRef.current = 0;
        const position = pickHazardPosition(currentBuildings, currentHazards);

        if (position) {
          const hazard = createHazard(position);
          hazardsRef.current = [...currentHazards, hazard];
          setHazards(hazardsRef.current);
          showToast('Short circuit on the floor');
        }
      }

      setItems((currentItems) => {
        const nextItems: Item[] = [];
        const particlesToAdd: SaleParticle[] = [];
        let soldThisFrame = 0;

        for (const item of currentItems) {
          const advancedItem = advanceItem(item, currentBuildings, hazardsRef.current, effectiveDeltaSeconds);

          if (advancedItem.soldAt) {
            soldThisFrame += 1;
            particlesToAdd.push({
              id: createId('sale'),
              x: advancedItem.soldAt.x,
              y: advancedItem.soldAt.y,
              amount: ORE_VALUE,
            });
            continue;
          }

          if (advancedItem.item) {
            nextItems.push(advancedItem.item);
          }
        }

        for (const building of currentBuildings) {
          if (building.type !== 'miner') {
            continue;
          }

          if (getHazardAt(hazardsRef.current, building)) {
            continue;
          }

          minerTimersRef.current[building.id] = (minerTimersRef.current[building.id] ?? 0) + effectiveDeltaSeconds;

          if (minerTimersRef.current[building.id] < MINER_INTERVAL_SECONDS) {
            continue;
          }

          minerTimersRef.current[building.id] = 0;
          const outputPosition = getNextPosition(building, 'right');

          if (!canReceiveOreWithHazards(currentBuildings, hazardsRef.current, outputPosition)) {
            continue;
          }

          const isOutputBusy = nextItems.some((item) => isSamePosition(item.to, outputPosition));

          if (isOutputBusy) {
            continue;
          }

          nextItems.push({
            id: createId('ore'),
            from: { x: building.x, y: building.y },
            to: outputPosition,
            progress: 0,
          });
        }

        if (soldThisFrame > 0) {
          const earned = soldThisFrame * ORE_VALUE;
          const saleEntries = Array.from({ length: soldThisFrame }, () => Date.now());
          saleTimesRef.current = countRecentSales([...saleTimesRef.current, ...saleEntries]);
          setProductionRate(saleTimesRef.current.length);
          setCoins((current) => current + earned);
          setCoinPulseKey((current) => current + 1);
          setStats((current) => ({ ...current, itemsSold: current.itemsSold + soldThisFrame }));
          setShift((current) => {
            const nextShift = {
              ...current,
              soldThisShift: current.soldThisShift + soldThisFrame,
            };

            shiftRef.current = nextShift;
            return nextShift;
          });
          setParticles((current) => [...current, ...particlesToAdd]);
          showToast(`Ore sold +${earned}`);

          window.setTimeout(() => {
            const soldIds = new Set(particlesToAdd.map((particle) => particle.id));
            setParticles((current) => current.filter((particle) => !soldIds.has(particle.id)));
          }, 900);
        }

        return nextItems;
      });

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [showToast]);

  useEffect(() => {
    const rateTimer = window.setInterval(() => {
      saleTimesRef.current = countRecentSales(saleTimesRef.current);
      setProductionRate(saleTimesRef.current.length);
    }, 1000);

    return () => window.clearInterval(rateTimer);
  }, []);

  const handleCellClick = (position: Position) => {
    const occupiedBuilding = buildings.find((building) => building.x === position.x && building.y === position.y);
    const hazard = getHazardAt(hazards, position);

    if (selectedTool === 'delete') {
      if (hazard) {
        setHazards((current) => current.filter((entry) => entry.id !== hazard.id));
        setItems((current) =>
          current.filter((item) => !isSamePosition(item.from, position) && !isSamePosition(item.to, position)),
        );
        showToast('Short circuit cleared');
        return;
      }

      if (!occupiedBuilding) {
        showToast('Cell is already empty');
        return;
      }

      setBuildings((current) => current.filter((building) => building.id !== occupiedBuilding.id));
      setItems((current) =>
        current.filter((item) => !isSamePosition(item.from, position) && !isSamePosition(item.to, position)),
      );
      showToast('Building removed');
      return;
    }

    if (hazard) {
      showToast('Cell is shorted');
      return;
    }

    if (occupiedBuilding) {
      showToast('Cell is occupied');
      return;
    }

    const cost = BUILDING_COSTS[selectedTool];

    if (coins < cost) {
      showToast('Not enough coins');
      return;
    }

    setBuildings((current) => [...current, createBuilding(selectedTool, position, conveyorDirection)]);
    setCoins((current) => current - cost);
  };

  const resetGame = () => {
    const newGame = createNewGame();

    clearSavedGame();
    minerTimersRef.current = {};
    hazardTimerRef.current = 0;
    saleTimesRef.current = [];
    shiftRef.current = newGame.shift;
    hazardsRef.current = [];
    setCoins(newGame.coins);
    setStats(newGame.stats);
    setShift(newGame.shift);
    setBuildings(newGame.buildings);
    setItems([]);
    setHazards([]);
    setParticles([]);
    setProductionRate(0);
    setCoinPulseKey((current) => current + 1);
    setSelectedTool('miner');
    setConveyorDirection('right');
    showToast('Factory reset');
  };

  const powerUsed = getPowerUsage(buildings);
  const powerCapacity = getPowerCapacity(shift.number);

  return (
    <main className="app-shell">
      <Header
        coins={coins}
        stats={stats}
        shift={shift}
        productionRate={productionRate}
        coinsPerMinute={productionRate * ORE_VALUE}
        coinPulseKey={coinPulseKey}
        powerUsed={powerUsed}
        powerCapacity={powerCapacity}
      />

      <section className="game-layout">
        <Toolbar
          coins={coins}
          selectedTool={selectedTool}
          conveyorDirection={conveyorDirection}
          onSelectTool={setSelectedTool}
          onRotate={rotateConveyor}
          onReset={resetGame}
        />

        <FactoryGrid
          buildings={buildings}
          items={items}
          hazards={hazards}
          particles={particles}
          selectedTool={selectedTool}
          conveyorDirection={conveyorDirection}
          onCellClick={handleCellClick}
        />

        <HelpPanel />
      </section>

      <ToastStack toasts={toasts} />
      <div className="screen-gradient" aria-hidden="true" />
      <div className="ambient-lines" aria-hidden="true" />
    </main>
  );
}
