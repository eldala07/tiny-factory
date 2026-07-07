import type { GameStats, ShiftState } from '../game/types';

type HeaderProps = {
  coins: number;
  stats: GameStats;
  shift: ShiftState;
  productionRate: number;
  coinsPerMinute: number;
  coinPulseKey: number;
  powerUsed: number;
  powerCapacity: number;
};

function formatTime(seconds: number) {
  const clampedSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clampedSeconds / 60);
  const remainingSeconds = clampedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function Header({
  coins,
  stats,
  shift,
  productionRate,
  coinsPerMinute,
  coinPulseKey,
  powerUsed,
  powerCapacity,
}: HeaderProps) {
  const quotaProgress = Math.min(100, (shift.soldThisShift / shift.quota) * 100);
  const isOverloaded = powerUsed > powerCapacity;

  return (
    <header className="game-header">
      <div>
        <p className="eyebrow">Disruption shift {shift.number}</p>
        <h1>Tiny Factory Builder</h1>
        <div className="quota-strip" aria-label="Current quota progress">
          <span>
            Quota {shift.soldThisShift}/{shift.quota}
          </span>
          <strong>{formatTime(shift.timeLeft)}</strong>
          <div className="quota-meter">
            <i style={{ width: `${quotaProgress}%` }} />
          </div>
          <small>{shift.failures}/3 misses before audit crash</small>
        </div>
      </div>
      <div className="stats-bar" aria-label="Factory stats">
        <div className="stat-card">
          <span>Coins</span>
          <strong className="coin-value" key={coinPulseKey}>
            {coins}
          </strong>
        </div>
        <div className="stat-card">
          <span>Cleared</span>
          <strong>{stats.shiftsCleared}</strong>
        </div>
        <div className="stat-card">
          <span>Ore/min</span>
          <strong>{productionRate}/min</strong>
        </div>
        <div className="stat-card">
          <span>Coins/min</span>
          <strong>{coinsPerMinute}/min</strong>
        </div>
        <div className={`stat-card ${isOverloaded ? 'danger-stat' : ''}`}>
          <span>Power</span>
          <strong>
            {powerUsed}/{powerCapacity}
          </strong>
        </div>
      </div>
    </header>
  );
}
