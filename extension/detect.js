// PortalGuard Shield: decides whether a wallet request is dangerous.
// Pure functions only (no DOM, no network), so they can be unit-tested in Node.
(function (root) {
  const PORTALDOT_CHAIN_ID = 420420777;

  // Spenders we trust on Portaldot testnet: asking them for an unlimited approval is the
  // intended SafeApprove flow, so no warning.
  const TRUSTED_SPENDERS = {
    [PORTALDOT_CHAIN_ID]: {
      "0x8ddbb4e933cc11e79ed82799b263af837bf0df0c": "PortalGuard SafeApprove",
    },
  };

  const SELECTORS = {
    approve: "0x095ea7b3",
    increaseAllowance: "0x39509351",
    setApprovalForAll: "0xa22cb465",
  };

  // Anything at or above 2^128 is "unlimited" in practice: no token has that much supply.
  const UNLIMITED = 2n ** 128n;

  function word(data, index) {
    const start = 10 + index * 64;
    return data.length >= start + 64 ? data.slice(start, start + 64) : null;
  }

  const toAddress = (w) => "0x" + w.slice(24).toLowerCase();

  function trustedName(chainId, spender) {
    return (TRUSTED_SPENDERS[chainId] || {})[spender.toLowerCase()] || null;
  }

  // An on-chain approval sent with eth_sendTransaction.
  function analyzeTransaction(tx, chainId) {
    if (!tx || typeof tx.data !== "string" || !tx.to) return null;
    const data = tx.data.toLowerCase();
    const selector = data.slice(0, 10);
    const token = tx.to.toLowerCase();

    if (selector === SELECTORS.approve || selector === SELECTORS.increaseAllowance) {
      const a = word(data, 0), b = word(data, 1);
      if (!a || !b) return null;
      const spender = toAddress(a);
      const amount = BigInt("0x" + b);
      if (amount === 0n) return null; // a revoke: always safe
      if (trustedName(chainId, spender)) return null;
      return {
        kind: "token-approval",
        token,
        spender,
        amount: amount.toString(),
        unlimited: amount >= UNLIMITED,
        risk: amount >= UNLIMITED ? "high" : "medium",
      };
    }

    if (selector === SELECTORS.setApprovalForAll) {
      const a = word(data, 0), b = word(data, 1);
      if (!a || !b) return null;
      if (BigInt("0x" + b) === 0n) return null; // turning it off
      const spender = toAddress(a);
      if (trustedName(chainId, spender)) return null;
      return { kind: "nft-approval-all", token, spender, unlimited: true, risk: "high" };
    }

    return null;
  }

  // An off-chain "Permit" signature: no gas, no transaction, but it grants spending rights.
  // Scam Sniffer found Permit signatures behind 56.7% of large drainer losses in 2024.
  function analyzeTypedData(params) {
    if (!Array.isArray(params) || params.length < 2) return null;
    let typed = params[1];
    if (typeof typed === "string") {
      try { typed = JSON.parse(typed); } catch { return null; }
    }
    if (!typed || typeof typed.primaryType !== "string" || !/permit/i.test(typed.primaryType)) return null;

    const msg = typed.message || {};
    const details = msg.details || {};
    const spender = String(msg.spender || "").toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(spender)) return null;

    let amount = null;
    for (const v of [msg.value, details.amount, msg.amount]) {
      if (v === undefined || v === null) continue;
      try { amount = BigInt(v); break; } catch { /* not a number */ }
    }
    const unlimited = amount === null || amount >= UNLIMITED;
    return {
      kind: "permit-signature",
      token: String(typed.domain?.verifyingContract || details.token || "").toLowerCase() || null,
      spender,
      amount: amount === null ? null : amount.toString(),
      unlimited,
      risk: "high",
    };
  }

  /**
   * Returns a finding for a dangerous request, or null when it is fine.
   * `chainId` is a number (e.g. 420420777) or null when unknown.
   */
  function analyzeRequest(method, params, chainId) {
    if (method === "eth_sendTransaction") return analyzeTransaction(params && params[0], chainId);
    if (method === "eth_signTypedData_v4" || method === "eth_signTypedData_v3") return analyzeTypedData(params);
    return null;
  }

  const api = { analyzeRequest, PORTALDOT_CHAIN_ID, UNLIMITED };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PortalGuardDetect = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
