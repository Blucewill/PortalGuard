// PortalGuard Shield: runs in the page itself (MAIN world), next to the website's code.
// It wraps the wallet's request() so dangerous permission requests are paused and
// explained before the wallet popup opens.
(function () {
  const { analyzeRequest } = window.PortalGuardDetect;
  const wrapped = new WeakSet();
  const SCANNER_URL = "http://localhost:4173/#scanner";

  // ---------- talking to the extension (via bridge.js) ----------
  let nextId = 1;
  const pending = new Map();
  window.addEventListener("message", (e) => {
    if (e.source !== window || e.data?.source !== "portalguard-ext") return;
    const resolve = pending.get(e.data.id);
    if (resolve) {
      pending.delete(e.data.id);
      resolve(e.data.result);
    }
  });
  function askExtension(type, payload) {
    return new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      window.postMessage({ source: "portalguard-page", id, type, payload }, "*");
      setTimeout(() => pending.has(id) && (pending.delete(id), resolve(null)), 4000);
    });
  }

  // ---------- helpers that read the chain through the site's own wallet ----------
  async function chainIdOf(original) {
    try { return parseInt(await original({ method: "eth_chainId" }), 16); } catch { return null; }
  }

  async function symbolOf(original, token) {
    if (!token) return null;
    try {
      const hex = await original({ method: "eth_call", params: [{ to: token, data: "0x95d89b41" }, "latest"] });
      const len = parseInt(hex.slice(66, 130), 16);
      const bytes = hex.slice(130, 130 + len * 2).match(/../g) || [];
      const text = bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join("");
      return /^[\x20-\x7e]{1,12}$/.test(text) ? text : null;
    } catch {
      return null;
    }
  }

  // ---------- the warning dialog ----------
  const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "unknown");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  function describe(f) {
    const what = f.symbol || "tokens";
    if (f.flagged) {
      return {
        tone: "danger",
        title: "Known wallet drainer",
        lead: `This site wants to give <b>${esc(short(f.spender))}</b> access to your ${esc(what)}. That address is on the PortalGuard Drainer Registry.`,
        risk: "Approving will very likely empty your wallet.",
      };
    }
    if (f.kind === "nft-approval-all") {
      return {
        tone: "high",
        title: "Access to ALL your NFTs",
        lead: `This site wants <b>${esc(short(f.spender))}</b> to move <b>every NFT</b> in this collection, now and in the future.`,
        risk: "Only continue if you fully trust this site, e.g. a marketplace you know.",
      };
    }
    if (f.kind === "permit-signature") {
      return {
        tone: "high",
        title: "Signature that lets someone spend your tokens",
        lead: `This is not a login. Signing gives <b>${esc(short(f.spender))}</b> permission to spend ${f.unlimited ? "<b>all</b> of your" : "some of your"} ${esc(what)}, with no further popup.`,
        risk: "Signature scams caused over half of large drainer losses in 2024.",
      };
    }
    if (f.unlimited) {
      return {
        tone: "high",
        title: "Unlimited spending permission",
        lead: `This site asks you to let <b>${esc(short(f.spender))}</b> take <b>all</b> your ${esc(what)}, at any time, with no expiry and no further popup.`,
        risk: "Wallet drainers use exactly this request. A real app rarely needs unlimited access.",
      };
    }
    return {
      tone: "medium",
      title: "Spending permission",
      lead: `This site asks you to let <b>${esc(short(f.spender))}</b> spend up to a set amount of your ${esc(what)}.`,
      risk: "Check that you trust this site. You can revoke it later in the PortalGuard scanner.",
    };
  }

  const COLORS = { danger: "#d93a3f", high: "#ff9700", medium: "#c77700" };

  function showWarning(f) {
    return new Promise((resolve) => {
      const d = describe(f);
      const host = document.createElement("div");
      host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647";
      const shadow = host.attachShadow({ mode: "closed" });
      shadow.innerHTML = `
        <style>
          * { box-sizing: border-box; font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }
          .scrim { position: fixed; inset: 0; background: rgba(13,13,15,.55); backdrop-filter: blur(3px);
                   display: grid; place-items: center; padding: 16px; }
          .card { width: min(460px, 100%); background: #f4f2ee; color: #141416; border-radius: 22px;
                  overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,.35); }
          .band { background: ${COLORS[d.tone]}; color: ${d.tone === "danger" ? "#fff" : "#141416"};
                  padding: 14px 20px; display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 14px; }
          .band svg { width: 26px; height: 26px; flex: none; border-radius: 6px; }
          .body { padding: 20px; }
          h2 { margin: 0 0 10px; font-size: 21px; line-height: 1.2; }
          p { margin: 0 0 12px; font-size: 15px; line-height: 1.45; color: #3a3b40; }
          .risk { font-weight: 600; color: #141416; }
          dl { margin: 0 0 16px; padding: 12px 14px; background: #fff; border-radius: 12px; font-size: 13px;
               display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; }
          dt { color: #7c7d83; } dd { margin: 0; font-family: Consolas, monospace; word-break: break-all; }
          .flag { color: #d93a3f; font-weight: 700; font-family: inherit; }
          .actions { display: flex; flex-direction: column; gap: 8px; }
          button { border: 0; border-radius: 999px; padding: 13px 18px; font-size: 15px; font-weight: 600; cursor: pointer; }
          .stop { background: #141416; color: #fff; }
          .go { background: transparent; color: #3a3b40; text-decoration: underline; }
          a { color: #3a3b40; font-size: 13px; text-align: center; display: block; margin-top: 6px; }
        </style>
        <div class="scrim" role="alertdialog" aria-modal="true" aria-labelledby="pg-title">
          <div class="card">
            <div class="band">
              <svg viewBox="0 0 400 400" aria-hidden="true"><rect width="400" height="400" rx="72" fill="#ff9700"/><path fill="#fff" fill-rule="evenodd" d="M109 99H239A30 30 0 0 1 269 129V199A40 40 0 0 1 229 239H184V301H109ZM184 145V193H194V145Z"/><g fill="#0d0d0f"><rect x="195" y="248" width="66" height="54" rx="4"/><rect x="269" y="248" width="23" height="19" rx="3"/><rect x="269" y="283" width="23" height="19" rx="3"/></g></svg>
              PortalGuard Shield paused this request
            </div>
            <div class="body">
              <h2 id="pg-title">${esc(d.title)}</h2>
              <p>${d.lead}</p>
              <p class="risk">${esc(d.risk)}</p>
              <dl>
                <dt>Website</dt><dd>${esc(location.hostname || location.href)}</dd>
                ${f.token ? `<dt>Token</dt><dd>${esc(f.symbol ? `${f.symbol} · ` : "")}${esc(short(f.token))}</dd>` : ""}
                <dt>Spender</dt><dd>${esc(short(f.spender))}${f.flagged ? ' <span class="flag">· REPORTED DRAINER</span>' : ""}</dd>
                <dt>Amount</dt><dd>${f.kind === "nft-approval-all" ? "All NFTs" : f.unlimited ? "Unlimited" : "Limited"}</dd>
              </dl>
              <div class="actions">
                <button class="stop" data-act="stop">Cancel (recommended)</button>
                <button class="go" data-act="go">I trust this site, continue to my wallet</button>
              </div>
              <a href="${SCANNER_URL}" target="_blank" rel="noreferrer">Check your existing permissions in the PortalGuard scanner</a>
            </div>
          </div>
        </div>`;
      const finish = (ok) => {
        host.remove();
        resolve(ok);
      };
      shadow.querySelector('[data-act="stop"]').addEventListener("click", () => finish(false));
      shadow.querySelector('[data-act="go"]').addEventListener("click", () => finish(true));
      (document.body || document.documentElement).appendChild(host);
      shadow.querySelector('[data-act="stop"]').focus();
    });
  }

  // ---------- wrapping the wallet ----------
  function rejection() {
    const err = new Error("PortalGuard Shield: you cancelled this request.");
    err.code = 4001; // the standard "user rejected" code, so sites handle it like a wallet cancel
    return err;
  }

  function wrapProvider(provider) {
    if (!provider || typeof provider.request !== "function" || wrapped.has(provider)) return;
    wrapped.add(provider);
    const original = provider.request.bind(provider);

    const guarded = async function (args) {
      const method = args?.method;
      if (method === "eth_sendTransaction" || method === "eth_signTypedData_v4" || method === "eth_signTypedData_v3") {
        const chainId = await chainIdOf(original);
        const finding = analyzeRequest(method, args.params, chainId);
        if (finding) {
          const [symbol, check] = await Promise.all([
            symbolOf(original, finding.token),
            askExtension("checkSpender", { spender: finding.spender, chainId }),
          ]);
          finding.symbol = symbol;
          finding.flagged = Boolean(check?.flagged);
          if (finding.flagged) finding.risk = "danger";
          const proceed = await showWarning(finding);
          askExtension("record", { proceeded: proceed, risk: finding.risk, host: location.hostname });
          if (!proceed) throw rejection();
        }
      }
      return original(args);
    };

    // Some wallets ignore a plain assignment without throwing, so check it took and fall back.
    try { provider.request = guarded; } catch { /* try defineProperty below */ }
    if (provider.request !== guarded) {
      try { Object.defineProperty(provider, "request", { value: guarded, configurable: true, writable: true }); } catch { /* frozen */ }
    }
    if (provider.request !== guarded) wrapped.delete(provider); // could not wrap: allow a later retry
    else console.info("[PortalGuard Shield] protecting wallet:", provider.isMetaMask ? "MetaMask" : provider.isTalisman ? "Talisman" : "unknown");
  }

  // Wallets may inject after us, so keep looking for a short while, and listen for EIP-6963 announcements.
  window.addEventListener("eip6963:announceProvider", (e) => wrapProvider(e.detail?.provider));
  window.addEventListener("ethereum#initialized", () => wrapProvider(window.ethereum));
  let tries = 0;
  const timer = setInterval(() => {
    wrapProvider(window.ethereum);
    if (++tries > 40) clearInterval(timer);
  }, 250);
  wrapProvider(window.ethereum);
})();
