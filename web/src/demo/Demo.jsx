import { useCallback, useEffect, useState } from "react";
import { getAddress } from "ethers";
import { Logo } from "../components/Header.jsx";
import { friendlyError, getSigner, hasWallet, shortAddress, walletProvider } from "../lib/chain.js";
import {
  approveUnlimited, demoReady, isNothingToTake, mintTestTokens, protectWithSafeApprove,
  readDemoState, runDrainer, runDrainerViaSafeApprove,
} from "../lib/demo.js";

function Step({ n, title, children, tone }) {
  return (
    <section className={`demo-step ${tone ? `demo-step-${tone}` : ""}`}>
      <span className="step-n">Step {n}</span>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Meter({ label, value, alert }) {
  return (
    <div className={alert ? "stat stat-alert" : "stat"}>
      <span className="stat-value demo-stat">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default function Demo() {
  const [account, setAccount] = useState(null);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const refresh = useCallback(async (who) => {
    if (!who || !demoReady) return;
    try {
      setState(await readDemoState(who));
    } catch (err) {
      setNotice({ kind: "error", text: friendlyError(err) });
    }
  }, []);

  useEffect(() => {
    if (!hasWallet()) return;
    const onAccounts = (accounts) => {
      const next = accounts[0] ? getAddress(accounts[0]) : null;
      setAccount(next);
      setState(null);
      refresh(next);
    };
    walletProvider()?.on?.("accountsChanged", onAccounts);
    return () => walletProvider()?.removeListener?.("accountsChanged", onAccounts);
  }, [refresh]);

  async function connect() {
    setNotice({ kind: "ok", text: "Waiting for your wallet… approve the MetaMask popup (click the fox icon if you don't see it)." });
    try {
      const who = await (await getSigner()).getAddress();
      setNotice(null);
      setAccount(who);
      refresh(who);
    } catch (err) {
      setNotice({ kind: "error", text: friendlyError(err) });
    }
  }

  // Run one on-chain action, then re-read balances so the meters update.
  async function act(key, fn, success) {
    setBusy(key);
    setNotice(null);
    try {
      const hash = await fn();
      setNotice({ kind: key.startsWith("drain") ? "error" : "ok", text: `${success} Tx ${shortAddress(hash)}` });
    } catch (err) {
      const text = friendlyError(err);
      setNotice(isNothingToTake(err)
        ? { kind: "ok", text: "The drainer found nothing to take. You're protected." }
        : { kind: text.includes("PortalGuard Shield") ? "ok" : "error", text });
    } finally {
      setBusy(null);
      refresh(account);
    }
  }

  const btn = (key, label, fn, success, disabled = false, style = "pill-dark") => (
    <button className={`pill ${style}`} disabled={!account || Boolean(busy) || disabled} onClick={() => act(key, fn, success)}>
      {busy === key ? "Waiting for wallet…" : label}
    </button>
  );

  return (
    <>
      <div className="demo-banner" role="note">
        PortalGuard demo · Portaldot <strong>testnet only</strong> · uses worthless test tokens (tUSD) from your own wallet
      </div>
      <header className="header">
        <Logo />
        <nav className="nav" aria-label="Main">
          <a href="./">Home</a>
          <a href="./#scanner">Scanner</a>
          <a href="./demo.html" className="active">Live demo</a>
        </nav>
        <div className="header-right">
          <button className="pill pill-ghost" onClick={connect}>
            {account ? shortAddress(account) : "Connect"}
          </button>
        </div>
      </header>

      <main className="section demo">
        <div className="section-head">
          <p className="eyebrow">Live demo</p>
          <h2>Watch a drainer work. <span className="fade">Then watch it fail.</span></h2>
          <p className="lede">
            A real approval attack, run on Portaldot testnet against your own wallet with test tokens.
            Use a separate demo account in MetaMask for this.
          </p>
        </div>

        {!demoReady && (
          <p className="status status-error" role="alert">
            The demo contracts aren't deployed yet. Run the deploy script and fill in web/src/config.js.
          </p>
        )}

        {account && state && (
          <div className="summary">
            <Meter label="Your tUSD" value={state.balance} />
            <Meter label="Drainer allowance" value={state.allowance} alert={state.allowance === "Unlimited"} />
            <Meter label="Stolen by attacker (all victims)" value={state.stolen} />
          </div>
        )}
        {!account && (
          <p className="hint">
            <button className="link" onClick={connect}>Connect your demo wallet</button> to begin.
          </p>
        )}
        {notice && <p className={`status status-${notice.kind} demo-toast`} role="status">{notice.text}</p>}

        <div className="demo-steps">
          <Step n={1} title="Get test tokens">
            <p>Mint 1,000 tUSD into your demo wallet. They have no value.</p>
            {btn("mint", "Mint 1,000 tUSD", () => mintTestTokens(account), "Minted 1,000 tUSD.", !demoReady)}
          </Step>

          <Step n={2} title="Fall for the trap">
            <div className="trap-card">
              <span className="chip chip-high">What victims see</span>
              <strong>🎁 Claim your 500 tUSD airdrop</strong>
              <span className="sub">"Just confirm in your wallet to receive your reward."</span>
            </div>
            <p>
              The button really asks for an <strong>unlimited approval</strong> for the drainer contract.
              Your wallet shows it as a spending cap, and most people click Confirm.
            </p>
            {btn("approve", "Claim airdrop (approve)", approveUnlimited, "Unlimited approval given.", !demoReady)}
          </Step>

          <Step n={3} title="The attack" tone="danger">
            <p>
              The attacker now moves your tokens without asking you again.
              {state && <> Right now they can take <strong>{state.takeable} tUSD</strong>.</>}
            </p>
            {btn("drain", "Run the drainer", () => runDrainer(account), "Drained! Your tUSD went to the attacker.", !demoReady)}
          </Step>

          <Step n={4} title="PortalGuard: scan and revoke" tone="dark">
            <p>
              Mint more tokens, then open the scanner. It flags the unlimited approval.
              Click <strong>Revoke</strong>, come back, and run the drainer again: it gets nothing.
            </p>
            <a
              className={`pill pill-soft ${account ? "" : "pill-off"}`}
              href={account ? `./?address=${account}#scanner` : undefined}
              target="_blank"
              rel="noreferrer"
            >
              Open PortalGuard scanner ↗
            </a>
          </Step>

          <Step n={5} title="SafeApprove: cap the damage">
            <p>
              Instead of an unlimited approval, give the app a <strong>10 tUSD grant that expires in 1 hour</strong>.
              Even a drainer can only take that.
              {state && <> Right now it could take <strong>{state.capped} tUSD</strong> this way.</>}
            </p>
            <div className="demo-actions">
              {btn("protect", "Use SafeApprove (2 confirmations)", protectWithSafeApprove, "10 tUSD grant set, expires in 1 hour.", !demoReady, "pill-soft")}
              {btn("drain-capped", "Run the drainer", () => runDrainerViaSafeApprove(account), "The drainer took only the 10 tUSD cap.", !demoReady)}
            </div>
          </Step>
        </div>
      </main>

      <footer className="footer">
        <Logo />
        <p>Demo contract refuses to deploy outside Portaldot testnet.</p>
      </footer>
    </>
  );
}
