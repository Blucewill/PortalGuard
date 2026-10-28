import { Contract, MaxUint256, formatUnits, parseUnits } from "ethers";
import { readProvider, getSigner } from "./chain.js";
import { CONTRACTS } from "../config.js";

// Everything the demo page does on-chain: test tokens, the trap approval, the attack,
// and the SafeApprove version of the same attack.

const TOKEN_ABI = [
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];
const DRAINER_ABI = [
  "function takeable(address token, address victim) view returns (uint256)",
  "function drain(address token, address victim) returns (uint256)",
  "function drainViaSafeApprove(address guard, address token, address victim) returns (uint256)",
  "function collector() view returns (address)",
  "error NothingToTake()",
];
const GUARD_ABI = [
  "function grant(address token, address spender, uint256 amount, uint64 expiresAt)",
  "function available(address owner, address token, address spender) view returns (uint256)",
];

export const demoReady = Boolean(CONTRACTS.demoToken && CONTRACTS.demoDrainer && CONTRACTS.safeApprove);

const fmt = (v) => Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 });

/** Current state of the demo for one wallet. */
export async function readDemoState(account) {
  const token = new Contract(CONTRACTS.demoToken, TOKEN_ABI, readProvider);
  const drainer = new Contract(CONTRACTS.demoDrainer, DRAINER_ABI, readProvider);
  const guard = new Contract(CONTRACTS.safeApprove, GUARD_ABI, readProvider);
  const collector = await drainer.collector();
  const [balance, allowance, takeable, capped, stolen] = await Promise.all([
    token.balanceOf(account),
    token.allowance(account, CONTRACTS.demoDrainer),
    drainer.takeable(CONTRACTS.demoToken, account),
    guard.available(account, CONTRACTS.demoToken, CONTRACTS.demoDrainer),
    token.balanceOf(collector),
  ]);
  return {
    balance: fmt(balance),
    allowance: allowance >= MaxUint256 / 2n ? "Unlimited" : fmt(allowance),
    hasAllowance: allowance > 0n,
    takeable: fmt(takeable),
    canDrain: takeable > 0n,
    capped: fmt(capped),
    canDrainCapped: capped > 0n && balance > 0n,
    stolen: fmt(stolen),
  };
}

async function send(contractAddress, abi, method, args) {
  const signer = await getSigner();
  const tx = await new Contract(contractAddress, abi, signer)[method](...args);
  await tx.wait();
  return tx.hash;
}

export const mintTestTokens = async (account) =>
  send(CONTRACTS.demoToken, TOKEN_ABI, "mint", [account, parseUnits("1000", 18)]);

// The trap: what a scam "claim" button really asks your wallet for.
export const approveUnlimited = () =>
  send(CONTRACTS.demoToken, TOKEN_ABI, "approve", [CONTRACTS.demoDrainer, MaxUint256]);

export const runDrainer = (account) =>
  send(CONTRACTS.demoDrainer, DRAINER_ABI, "drain", [CONTRACTS.demoToken, account]);

// SafeApprove path: approve the guard once, then give the "app" a small grant that expires in an hour.
export async function protectWithSafeApprove() {
  await send(CONTRACTS.demoToken, TOKEN_ABI, "approve", [CONTRACTS.safeApprove, MaxUint256]);
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  return send(CONTRACTS.safeApprove, GUARD_ABI, "grant",
    [CONTRACTS.demoToken, CONTRACTS.demoDrainer, parseUnits("10", 18), expiresAt]);
}

// True when a drain attempt failed because there was nothing to take, i.e. the protection worked.
export const isNothingToTake = (err) => err?.revert?.name === "NothingToTake";

export const runDrainerViaSafeApprove = (account) =>
  send(CONTRACTS.demoDrainer, DRAINER_ABI, "drainViaSafeApprove",
    [CONTRACTS.safeApprove, CONTRACTS.demoToken, account]);
