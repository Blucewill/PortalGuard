import { Contract, MaxUint256, ZeroAddress, formatUnits, getAddress, id, zeroPadValue } from "ethers";
import { readProvider, getSigner } from "./chain.js";
import { CONTRACTS } from "../config.js";

// The same Approval event signature is used by ERC-20 (3 topics: amount in data)
// and ERC-721 (4 topics: tokenId indexed).
const APPROVAL = id("Approval(address,address,uint256)");
const APPROVAL_FOR_ALL = id("ApprovalForAll(address,address,bool)");

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];
const ERC721_ABI = [
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function approve(address to, uint256 tokenId)",
  "function setApprovalForAll(address operator, bool approved)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
];
const REGISTRY_ABI = ["function isFlagged(address) view returns (bool)"];

const RISK_ORDER = { danger: 0, high: 1, medium: 2, low: 3 };

// Some RPCs cap how many blocks one log query may cover; split the range in half until it fits.
async function getLogsChunked(filter, fromBlock, toBlock) {
  try {
    return await readProvider.getLogs({ ...filter, fromBlock, toBlock });
  } catch (err) {
    if (toBlock - fromBlock < 1000) throw err;
    const mid = Math.floor((fromBlock + toBlock) / 2);
    const left = await getLogsChunked(filter, fromBlock, mid);
    const right = await getLogsChunked(filter, mid + 1, toBlock);
    return [...left, ...right];
  }
}

async function safeCall(promise, fallback) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

const tokenInfoCache = new Map();
async function tokenInfo(address) {
  if (!tokenInfoCache.has(address)) {
    const c = new Contract(address, ERC20_ABI, readProvider);
    tokenInfoCache.set(address, Promise.all([
      safeCall(c.name(), "Unknown token"),
      safeCall(c.symbol(), "???"),
      safeCall(c.decimals(), 18n),
    ]).then(([name, symbol, decimals]) => ({ name, symbol, decimals: Number(decimals) })));
  }
  return tokenInfoCache.get(address);
}

const registry = CONTRACTS.drainerRegistry
  ? new Contract(CONTRACTS.drainerRegistry, REGISTRY_ABI, readProvider)
  : null;

async function spenderInfo(address) {
  const [code, flagged] = await Promise.all([
    safeCall(readProvider.getCode(address), "0x"),
    registry ? safeCall(registry.isFlagged(address), false) : false,
  ]);
  return { isContract: code !== "0x", flagged };
}

function assessRisk(item) {
  if (item.flagged) return { risk: "danger", reason: "Reported drainer. Revoke now." };
  if (item.kind === "all") return { risk: "high", reason: "Can move every NFT in this collection." };
  if (item.unlimited) return { risk: "high", reason: "Unlimited amount, never expires." };
  if (!item.isContract) return { risk: "medium", reason: "Spender is a personal wallet, not an app." };
  return { risk: "low", reason: "Limited amount to a contract." };
}

function formatAmount(value, decimals) {
  const [whole, frac = ""] = formatUnits(value, decimals).split(".");
  const trimmed = frac.slice(0, 4).replace(/0+$/, "");
  return `${Number(whole).toLocaleString()}${trimmed ? `.${trimmed}` : ""}`;
}

/**
 * Find every approval `owner` has given that is still active today.
 * Reads Approval / ApprovalForAll events from the chain, then checks each one's current state,
 * because an old approval may since have been used up or revoked.
 */
export async function scanApprovals(owner, onProgress = () => {}) {
  const ownerTopic = zeroPadValue(owner, 32);
  const latest = await readProvider.getBlockNumber();

  onProgress(`Reading approval history up to block #${latest.toLocaleString()}…`);
  const [approvalLogs, forAllLogs] = await Promise.all([
    getLogsChunked({ topics: [APPROVAL, ownerTopic] }, 0, latest),
    getLogsChunked({ topics: [APPROVAL_FOR_ALL, ownerTopic] }, 0, latest),
  ]);

  // One candidate per (token, spender) or (collection, tokenId); later logs overwrite earlier ones.
  const candidates = new Map();
  for (const log of approvalLogs) {
    const token = getAddress(log.address);
    if (log.topics.length === 3) {
      const spender = getAddress("0x" + log.topics[2].slice(26));
      candidates.set(`erc20:${token}:${spender}`, { kind: "erc20", token, spender, block: log.blockNumber });
    } else if (log.topics.length === 4) {
      const tokenId = BigInt(log.topics[3]);
      candidates.set(`nft:${token}:${tokenId}`, { kind: "nft", token, tokenId, block: log.blockNumber });
    }
  }
  for (const log of forAllLogs) {
    const token = getAddress(log.address);
    const spender = getAddress("0x" + log.topics[2].slice(26));
    candidates.set(`all:${token}:${spender}`, { kind: "all", token, spender, block: log.blockNumber });
  }

  onProgress(`Checking ${candidates.size} approval${candidates.size === 1 ? "" : "s"} against the chain today…`);
  const checked = await Promise.all([...candidates].map(async ([key, c]) => {
    const info = await tokenInfo(c.token);
    let item;
    if (c.kind === "erc20") {
      const amount = await safeCall(new Contract(c.token, ERC20_ABI, readProvider).allowance(owner, c.spender), 0n);
      if (amount === 0n) return null;
      const unlimited = amount >= MaxUint256 / 2n;
      item = { ...c, amount, unlimited, amountLabel: unlimited ? "Unlimited" : `${formatAmount(amount, info.decimals)} ${info.symbol}` };
    } else if (c.kind === "nft") {
      const spender = await safeCall(new Contract(c.token, ERC721_ABI, readProvider).getApproved(c.tokenId), ZeroAddress);
      if (spender === ZeroAddress) return null;
      item = { ...c, spender: getAddress(spender), amountLabel: `NFT #${c.tokenId}` };
    } else {
      const approved = await safeCall(new Contract(c.token, ERC721_ABI, readProvider).isApprovedForAll(owner, c.spender), false);
      if (!approved) return null;
      item = { ...c, amountLabel: "All NFTs" };
    }
    item = { ...item, key, owner, ...info, ...(await spenderInfo(item.spender)) };
    return { ...item, ...assessRisk(item) };
  }));

  return checked
    .filter(Boolean)
    .sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || b.block - a.block);
}

/** Revoke one approval from the connected wallet. Returns the transaction hash once mined. */
export async function revokeApproval(item) {
  const signer = await getSigner();
  if ((await signer.getAddress()).toLowerCase() !== item.owner.toLowerCase()) {
    throw new Error("Only the wallet that gave this approval can revoke it. Switch accounts in your wallet.");
  }
  let tx;
  if (item.kind === "erc20") {
    tx = await new Contract(item.token, ERC20_ABI, signer).approve(item.spender, 0);
  } else if (item.kind === "nft") {
    tx = await new Contract(item.token, ERC721_ABI, signer).approve(ZeroAddress, item.tokenId);
  } else {
    tx = await new Contract(item.token, ERC721_ABI, signer).setApprovalForAll(item.spender, false);
  }
  await tx.wait();
  return tx.hash;
}
