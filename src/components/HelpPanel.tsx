export function HelpPanel() {
  return (
    <aside className="help-panel">
      <div className="panel-title">
        <span>Shift rules</span>
        <strong>Survive quotas</strong>
      </div>
      <p>
        Every shift has a timer and quota. Missing three quotas triggers an audit crash that strips
        conveyors.
      </p>
      <p>Short circuits block cells and routes. Use delete mode to clear them before the line starves.</p>
      <p>Going over power capacity slows every miner and conveyor. Progress saves automatically.</p>
    </aside>
  );
}
