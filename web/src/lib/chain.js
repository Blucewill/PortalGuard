import { BrowserProvider, JsonRpcProvider, Network } from "ethers";
import { PORTALDOT } from "../config.js";

const network = Network.from({ chainId: PORTALDOT.chainId, name: "portaldot" });

// Read-only connection to Portaldot. Works without a wallet.
export const readProvider = new JsonRpcProvider(PORTALDOT.rpcUrl, network, { staticNetwork: network });

export function hasWallet() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

// Switch the user's wallet to Portaldot, adding the network first if the wallet doesn't know it.
async function ensurePortaldot() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: PORTALDOT.chainIdHex }],
    });
  } catch (err) {
    const code = err?.code ?? err?.data?.originalError?.code;
    if (code !== 4902) throw err;
    await window.ethereum.request({
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
  await window.ethereum.request({ method: "eth_requestAccounts" });
  await ensurePortaldot();
  // A fresh provider each time, so a network switch in the wallet never leaves us stale.
  return new BrowserProvider(window.ethereum).getSigner();
}

export function friendlyError(err) {
  if (err?.code === 4001 || err?.code === "ACTION_REJECTED" || err?.info?.error?.code === 4001) {
    return "You cancelled the request in your wallet.";
  }
  return err?.shortMessage || err?.reason || err?.message || "Something went wrong.";
}

export function shortAddress(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
