import ShieldVisual from "./ShieldVisual.jsx";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Hero({ onScan, walletError }) {
  return (
    <section className="hero">
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Wallet security for Portaldot</p>
          <h1>
            Stop drainers
            <br />
            before they
            <br />
            <span className="fade">drain you.</span>
          </h1>
          <p className="hero-meta">
            <span className="dots" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            Free · Open source · No sign-up
          </p>
          <div className="hero-actions">
            <button className="pill pill-dark" onClick={onScan}>
              Scan my wallet
              <span className="pill-icon"><ArrowIcon /></span>
            </button>
            <a className="pill pill-soft" href="#how">How it works</a>
          </div>
          {walletError && <p className="hero-error" role="alert">{walletError}</p>}
        </div>

        <aside className="hero-side">
          <div className="glass-card">
            <div className="glass-tile">
              <span className="big">~$494M</span>
            </div>
            <div className="glass-text">
              <p>stolen by wallet drainers in 2024.</p>
              <small>Source: Scam Sniffer, 2024 report</small>
              <div className="glass-bars" aria-hidden="true"><i className="on" /><i /><i /></div>
            </div>
          </div>
          <div className="built-with">
            <p>Built with</p>
            <ul>
              <li>Portaldot V3</li>
              <li>OpenZeppelin</li>
              <li>ethers.js</li>
              <li>Hardhat</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="hero-visual">
        <ShieldVisual />
      </div>
      <div className="wordmark" aria-hidden="true">GUARD</div>

      <div className="hero-bar">
        <span>• Chain ID 420420777</span>
        <span className="hide-sm">• Built on Portaldot V3</span>
        <a href="#scanner">Scroll down ↓</a>
      </div>
    </section>
  );
}
