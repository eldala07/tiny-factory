import type { GameStats } from '../game/types';

type HeaderProps = {
  coins: number;
  stats: GameStats;
  productionRate: number;
  coinsPerMinute: number;
  coinPulseKey: number;
};

export function Header({ coins, stats, productionRate, coinsPerMinute, coinPulseKey }: HeaderProps) {
  return (
    <header className="game-header">
      <div>
        <p className="eyebrow">Incremental factory</p>
        <h1>Tiny Factory Builder</h1>
      </div>
      <div className="stats-bar" aria-label="Factory stats">
        <div className="stat-card">
          <span>Coins</span>
          <strong className="coin-value" key={coinPulseKey}>
            {coins}
          </strong>
        </div>
        <div className="stat-card">
          <span>Sold</span>
          <strong>{stats.itemsSold}</strong>
        </div>
        <div className="stat-card">
          <span>Ore / min</span>
          <strong>{productionRate}/min</strong>
        </div>
        <div className="stat-card">
          <span>Coins / min</span>
          <strong>{coinsPerMinute}/min</strong>
        </div>
      </div>
    </header>
  );
}
