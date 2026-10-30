import { BrowserProvider, JsonRpcProvider, Network } from "ethers";
import { PORTALDOT } from "../config.js";

const network = Network.from({ chainId: PORTALDOT.chainId, name: "portaldot" });

// Read-only connection to Portaldot. Works without a wallet.
export const readProvider = new JsonRpcProvider(PORTALDOT.rpcUrl, network, { staticNetwork: network });

// With several wallet extensions installed (MetaMask, Talisman, …) they fight over window.ethereum.
// Wallets also announce themselves by name (EIP-6963), so prefer MetaMask explicitly.
const announced = [];
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e) => {
    if (e.detail?.provider && !announced.some((d) => d.info?.uuid === e.detail.info?.uuid)) announced.push(e.detail);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function walletProvider() {
  if (typeof window === "undefined") return null;
  const preferred = announced.find((d) => d.info?.rdns === "io.metamask") || announced[0];
  return preferred?.provider || window.ethereum || null;
}

export function hasWallet() {
  return Boolean(walletProvider());
}

// Switch the user's wallet to Portaldot, adding the network first if the wallet doesn't know it.
async function ensurePortaldot() {
  try {
    await walletProvider().request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: PORTALDOT.chainIdHex }],
    });
  } catch (err) {
    const code = err?.code ?? err?.data?.originalError?.code;
    if (code !== 4902) throw err;
    await walletProvider().request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: PORTALDOT.chainIdHex,
        chainName: PORTALDOT.name,
        nativeCurrency: PORTALDOT.currency,
        rpcUrls: [PORTALDOT.rpcUrl],
      }],
    });
  }
}

// Returns a signer on Portaldot. Asks the wallet to connect and switch network if needed.
export async function getSigner() {
  if (!hasWallet()) {
    throw new Error("No wallet found. Install MetaMask, then reload this page.");
  }
  const wallet = walletProvider();
  await wallet.request({ method: "eth_requestAccounts" });
  await ensurePortaldot();
  // A fresh provider each time, so a network switch in the wallet never leaves us stale.
  return new BrowserProvider(wallet).getSigner();
}

export function friendlyError(err) {
  if (err?.code === 4001 || err?.code === "ACTION_REJECTED" || err?.info?.error?.code === 4001) {
    // The PortalGuard Shield extension cancels with the same code; say so, since the wallet never opened.
    const message = `${err?.message ?? ""} ${err?.info?.error?.message ?? ""}`;
    if (message.includes("PortalGuard Shield")) {
      return "🛡️ PortalGuard Shield blocked this request. Your wallet was never asked.";
    }
    return "You cancelled the request in your wallet.";
  }
  return err?.shortMessage || err?.reason || err?.message || "Something went wrong.";
}

export function shortAddress(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
