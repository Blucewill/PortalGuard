// PortalGuard Shield: background worker. Checks spenders against the on-chain
// Drainer Registry on Portaldot and keeps a small count of warnings for the popup.
const PORTALDOT = {
  chainId: 420420777,
  rpcUrl: "https://test-evm-rpc-v3.portaldot.dev",
  drainerRegistry: "0x96e57f7F7c2B44482BB1a95F6bc53134e2a411a1",
};
const IS_FLAGGED = "0xfef48a99"; // isFlagged(address)

async function isFlagged(spender) {
  const data = IS_FLAGGED + spender.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const res = await fetch(PORTALDOT.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: PORTALDOT.drainerRegistry, data }, "latest"] }),
  });
  const { result } = await res.json();
  return typeof result === "string" && BigInt(result) === 1n;
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === "checkSpender") {
    const { spender, chainId } = msg.payload || {};
    if (chainId !== PORTALDOT.chainId || !/^0x[0-9a-fA-F]{40}$/.test(spender || "")) {
      reply({ flagged: false, checked: false });
      return false;
    }
    isFlagged(spender)
      .then((flagged) => reply({ flagged, checked: true }))
      .catch(() => reply({ flagged: false, checked: false }));
    return true; // reply arrives asynchronously
  }

  if (msg?.type === "record") {
    chrome.storage.local.get({ warned: 0, cancelled: 0 }).then((s) => {
      chrome.storage.local.set({ warned: s.warned + 1, cancelled: s.cancelled + (msg.payload?.proceeded ? 0 : 1) });
    });
    reply({ ok: true });
    return false;
  }
  return false;
});
