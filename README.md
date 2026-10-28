# PortalGuard

Wallet-drainer protection for the Portaldot V3 network.

## The problem

Wallet drainers stole roughly $300M from regular users in 2023 and roughly $500M in 2024
(Scam Sniffer reports). Most of these attacks work the same way: a fake site asks the
user to approve a token, the user grants an **unlimited allowance that never expires**,
and the attacker empties the wallet, sometimes weeks later.

## The solution

PortalGuard replaces unlimited approvals with **capped, expiring permissions**:

- **SafeApprove**: the user approves this contract once, then grants each app a cap and
  an expiry (for example "50 tUSD for 24 hours"). Apps pull tokens through SafeApprove,
  so a malicious app can take at most its cap, only until the expiry.
- **Lockdown**: one transaction invalidates every grant the user has ever made.
- **Batch revoke**: revoke many grants in one transaction.
- **DrainerRegistry**: anyone can report a suspicious address; confirmed drainers are
  flagged, and SafeApprove refuses to grant to or pay them.

- **Web app** (`web/`): scans any wallet's existing approvals on Portaldot, flags the risky
  ones (unlimited amounts, whole-NFT-collection access, personal-wallet spenders, reported
  drainers) and revokes them with one click. Share a scan with `?address=0x…`.

## Network

| | |
|---|---|
| EVM RPC | `https://test-evm-rpc-v3.portaldot.dev` |
| Chain ID | `420420777` |

## Run it

```bash
npm install
npm test                  # run the contract tests on a local simulated chain
cp .env.example .env      # then put a TESTNET-ONLY private key in .env
npm run deploy:portaldot  # deploy to the Portaldot testnet
```

Web app:

```bash
cd web
npm install
npm run dev               # open the printed localhost link
```

### How the scanner works

1. Reads every `Approval` and `ApprovalForAll` event the wallet ever emitted on Portaldot
   (`eth_getLogs`, split into smaller block ranges if the RPC limits the range).
2. Checks each one's state today (`allowance`, `getApproved`, `isApprovedForAll`), since
   old approvals may already be used up or revoked.
3. Rates the risk of each active approval and lets the owner revoke it from their wallet.

## Deployed contracts (Portaldot testnet)

_To be added after deployment._

## Third-party code

- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) (MIT)
- [Hardhat](https://hardhat.org) (MIT)
