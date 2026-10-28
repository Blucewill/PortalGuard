import { shortAddress } from "../lib/chain.js";

export function Logo() {
  return (
    <a className="logo" href="#top" aria-label="PortalGuard home">
      <svg viewBox="0 0 32 36" aria-hidden="true">
        <path d="M16 1 30 6v11c0 9-6 15-14 18C8 32 2 26 2 17V6Z" fill="currentColor" />
        <rect x="7" y="14" width="18" height="5" rx="2.5" fill="var(--accent)" />
      </svg>
      PortalGuard
    </a>
  );
}

export default function Header({ account, block, onConnect }) {
  return (
    <header className="header" id="top">
      <Logo />
      <nav className="nav" aria-label="Main">
        <a href="#top" className="active">Home</a>
        <a href="#scanner">Scanner</a>
        <a href="#how">How it works</a>
      </nav>
      <div className="header-right">
        <div className="net-badge" title="Portaldot Testnet V3 · Chain ID 420420777">
          <span className="net-label">Portaldot V3</span>
          <span className="net-value">
            <i className={block ? "dot live" : "dot"} />
            {block ? `#${block.toLocaleString()}` : "Connecting…"}
          </span>
        </div>
        <button className="pill pill-ghost" onClick={onConnect}>
          {account ? shortAddress(account) : "Connect"}
        </button>
      </div>
    </header>
  );
}
