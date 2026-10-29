import { shortAddress } from "../lib/chain.js";

export function Logo() {
  return (
    <a className="logo" href="#top" aria-label="PortalGuard home">
      <svg viewBox="0 0 400 400" aria-hidden="true">
        <rect width="400" height="400" rx="72" fill="var(--brand)" />
        <path fill="#fff" fillRule="evenodd" d="M109 99H239A30 30 0 0 1 269 129V199A40 40 0 0 1 229 239H184V301H109ZM184 145V193H194V145Z" />
        <g fill="#0d0d0f">
          <rect x="195" y="248" width="66" height="54" rx="4" />
          <rect x="269" y="248" width="23" height="19" rx="3" />
          <rect x="269" y="283" width="23" height="19" rx="3" />
        </g>
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
        <a href="/demo.html">Live demo</a>
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
