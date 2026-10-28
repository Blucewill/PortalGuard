import { useCallback, useEffect, useState } from "react";
import { getAddress, isAddress } from "ethers";
import { friendlyError, shortAddress } from "../lib/chain.js";
import { revokeApproval, scanApprovals } from "../lib/scan.js";
import { SAMPLE_ADDRESS } from "../config.js";

const RISK_LABEL = { danger: "Drainer", high: "High risk", medium: "Check", low: "Low risk" };
const KIND_LABEL = { erc20: "Token", nft: "NFT", all: "NFT collection" };

function Summary({ items }) {
  const unlimited = items.filter((i) => i.unlimited || i.kind === "all").length;
  const risky = items.filter((i) => i.risk === "danger" || i.risk === "high").length;
  return (
    <div className="summary">
      <div className="stat"><span className="stat-value">{items.length}</span><span className="stat-label">Active approvals</span></div>
      <div className="stat"><span className="stat-value">{unlimited}</span><span className="stat-label">Unlimited</span></div>
      <div className={risky ? "stat stat-alert" : "stat"}><span className="stat-value">{risky}</span><span className="stat-label">High risk</span></div>
    </div>
  );
}

function ApprovalRow({ item, canRevoke, revoking, onRevoke }) {
  return (
    <li className={`row risk-${item.risk}`}>
      <div className="row-token">
        <span className="token-badge">{item.symbol.slice(0, 4)}</span>
        <div>
          <strong>{item.symbol}</strong>
          <span className="sub">{item.name} · {KIND_LABEL[item.kind]}</span>
        </div>
      </div>
      <div className="row-spender">
        <span className="label">Spender</span>
        <code title={item.spender}>{shortAddress(item.spender)}</code>
        <span className="sub">{item.isContract ? "App contract" : "Personal wallet"}</span>
      </div>
      <div className="row-amount">
        <span className="label">Can take</span>
        <strong className={item.unlimited || item.kind === "all" ? "unlimited" : ""}>{item.amountLabel}</strong>
      </div>
      <div className="row-risk">
        <span className={`chip chip-${item.risk}`}>{RISK_LABEL[item.risk]}</span>
        <span className="sub">{item.reason}</span>
      </div>
      <div className="row-action">
        <button
          className="pill pill-dark pill-sm"
          disabled={!canRevoke || revoking}
          title={canRevoke ? "Send a transaction that sets this approval to zero" : "Connect the wallet that owns this approval to revoke"}
          onClick={() => onRevoke(item)}
        >
          {revoking ? "Revoking…" : "Revoke"}
        </button>
      </div>
    </li>
  );
}

export default function Scanner({ account, onConnect }) {
  const [input, setInput] = useState("");
  const [scan, setScan] = useState({ status: "idle" });
  const [progress, setProgress] = useState("");
  const [revokingKey, setRevokingKey] = useState(null);
  const [notice, setNotice] = useState(null);

  const run = useCallback(async (address) => {
    setNotice(null);
    if (!isAddress(address)) {
      setScan({ status: "error", error: "That doesn't look like a valid 0x… address." });
      return;
    }
    const owner = getAddress(address);
    setScan({ status: "scanning", owner });
    try {
      const items = await scanApprovals(owner, setProgress);
      setScan({ status: "done", owner, items });
    } catch (err) {
      setScan({ status: "error", error: friendlyError(err) });
    }
  }, []);

  // Shareable scans: ?address=0x… scans that wallet on page load.
  useEffect(() => {
    const address = new URLSearchParams(window.location.search).get("address");
    if (address) {
      setInput(address);
      run(address);
    }
  }, [run]);

  // Scan the connected wallet as soon as it connects or changes.
  useEffect(() => {
    if (account) {
      setInput(account);
      run(account);
    }
  }, [account, run]);

  async function handleRevoke(item) {
    setRevokingKey(item.key);
    setNotice(null);
    try {
      const hash = await revokeApproval(item);
      setScan((s) => ({ ...s, items: s.items.filter((i) => i.key !== item.key) }));
      setNotice({ kind: "ok", text: `Revoked ${item.symbol} for ${shortAddress(item.spender)}. Tx ${shortAddress(hash)}` });
    } catch (err) {
      setNotice({ kind: "error", text: friendlyError(err) });
    } finally {
      setRevokingKey(null);
    }
  }

  const ownsScan = account && scan.owner && account.toLowerCase() === scan.owner.toLowerCase();

  return (
    <section className="section scanner" id="scanner">
      <div className="section-head">
        <p className="eyebrow">Approval scanner</p>
        <h2>See who can <span className="fade">spend your tokens.</span></h2>
        <p className="lede">
          Every "approve" you ever clicked is still live until you revoke it. Paste any Portaldot address,
          or connect your wallet to scan and revoke.
        </p>
      </div>

      <form
        className="scan-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(input.trim());
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0x… wallet address"
          spellCheck="false"
          autoComplete="off"
          aria-label="Wallet address to scan"
        />
        <button className="pill pill-dark" type="submit" disabled={scan.status === "scanning"}>
          {scan.status === "scanning" ? "Scanning…" : "Scan"}
        </button>
      </form>
      <div className="scan-links">
        {!account && <button className="link" onClick={onConnect}>Connect wallet</button>}
        <button className="link" onClick={() => { setInput(SAMPLE_ADDRESS); run(SAMPLE_ADDRESS); }}>
          Try a sample wallet
        </button>
      </div>

      {scan.status === "scanning" && <p className="status"><span className="spinner" aria-hidden="true" />{progress}</p>}
      {scan.status === "error" && <p className="status status-error" role="alert">{scan.error}</p>}
      {notice && <p className={`status status-${notice.kind}`} role="status">{notice.text}</p>}

      {scan.status === "done" && (
        <>
          <Summary items={scan.items} />
          {scan.items.length === 0 ? (
            <p className="empty">No active approvals. This wallet is clean.</p>
          ) : (
            <>
              {!ownsScan && (
                <p className="hint">Viewing read-only. Connect {shortAddress(scan.owner)} in your wallet to revoke.</p>
              )}
              <ul className="rows">
                {scan.items.map((item) => (
                  <ApprovalRow
                    key={item.key}
                    item={item}
                    canRevoke={ownsScan}
                    revoking={revokingKey === item.key}
                    onRevoke={handleRevoke}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
