import { useCallback, useEffect, useRef, useState } from 'react';
import { FactoryGrid } from './components/FactoryGrid';
import { Header } from './components/Header';
import { HelpPanel } from './components/HelpPanel';
import { ToastStack } from './components/ToastStack';
import { Toolbar } from './components/Toolbar';
import {
  BUILDING_COSTS,
  ITEM_SPEED_CELLS_PER_SECOND,
  MINER_INTERVAL_SECONDS,
  ORE_VALUE,
} from './game/constants';
import {
  canReceiveOre,
  cellKey,
  getBuildingAt,
  getNextPosition,
  rotateDirection,
} from './game/factory';
import { clearSavedGame, createNewGame, loadGame, saveGame } from './game/storage';
import type { Building, Direction, GameStats, Item, Position, SaleParticle, Toast, Tool } from './game/types';

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

function createStuckItem(item: Item, position: Position): Item {
  return {
    ...item,
    from: position,
    to: position,
    progress: 0,
  };
}

function getMovingItem(item: Item, buildings: Building[]): Item | null {
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

  if (!canReceiveOre(buildings, nextPosition)) {
    return createStuckItem(item, item.to);
  }

  return {
    ...item,
    from: item.to,
    to: nextPosition,
    progress: 0,
  };
}

function updateItemRoute(item: Item, buildings: Building[], deltaSeconds: number) {
  if (isSamePosition(item.from, item.to)) {
    return getMovingItem(item, buildings);
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

function advanceItem(item: Item, buildings: Building[], deltaSeconds: number): AdvancedItem {
  let updatedItem = updateItemRoute(item, buildings, deltaSeconds);

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

export default function App() {
  const [initialGame] = useState(loadGame);
  const [coins, setCoins] = useState(initialGame.coins);
  const [stats, setStats] = useState<GameStats>(initialGame.stats);
  const [buildings, setBuildings] = useState<Building[]>(initialGame.buildings);
  const [items, setItems] = useState<Item[]>([]);
  const [particles, setParticles] = useState<SaleParticle[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool>('miner');
  const [conveyorDirection, setConveyorDirection] = useState<Direction>('right');
  const [productionRate, setProductionRate] = useState(0);
  const [coinPulseKey, setCoinPulseKey] = useState(0);

  const buildingsRef = useRef(buildings);
  const minerTimersRef = useRef<Record<string, number>>({});
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
    saveGame({ coins, stats, buildings });
  }, [coins, stats, buildings]);

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
    const tick = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }

      const deltaSeconds = Math.min((timestamp - lastFrameTimeRef.current) / 1000, 0.08);
      lastFrameTimeRef.current = timestamp;
      const currentBuildings = buildingsRef.current;

      setItems((currentItems) => {
        const nextItems: Item[] = [];
        const particlesToAdd: SaleParticle[] = [];
        let soldThisFrame = 0;

        for (const item of currentItems) {
          const advancedItem = advanceItem(item, currentBuildings, deltaSeconds);

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

          minerTimersRef.current[building.id] = (minerTimersRef.current[building.id] ?? 0) + deltaSeconds;

          if (minerTimersRef.current[building.id] < MINER_INTERVAL_SECONDS) {
            continue;
          }

          minerTimersRef.current[building.id] = 0;
          const outputPosition = getNextPosition(building, 'right');

          if (!canReceiveOre(currentBuildings, outputPosition)) {
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
          setStats((current) => ({ itemsSold: current.itemsSold + soldThisFrame }));
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

    if (selectedTool === 'delete') {
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
    saleTimesRef.current = [];
    setCoins(newGame.coins);
    setStats(newGame.stats);
    setBuildings(newGame.buildings);
    setItems([]);
    setParticles([]);
    setProductionRate(0);
    setCoinPulseKey((current) => current + 1);
    setSelectedTool('miner');
    setConveyorDirection('right');
    showToast('Factory reset');
  };

  return (
    <main className="app-shell">
      <Header
        coins={coins}
        stats={stats}
        productionRate={productionRate}
        coinsPerMinute={productionRate * ORE_VALUE}
        coinPulseKey={coinPulseKey}
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
