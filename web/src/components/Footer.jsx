import { Logo } from "./Header.jsx";

export default function Footer() {
  return (
    <footer className="footer">
      <Logo />
      <p>Built for the Portaldot V3 Hacker House. Testnet only. Never share your recovery phrase.</p>
      <a href="https://github.com/Blucewill/PortalGuard" target="_blank" rel="noreferrer">GitHub ↗</a>
    </footer>
  );
}
