# PortalGuard

**Wallet-drainer protection for the Portaldot network.**

PortalGuard stops the most common way crypto wallets get emptied: a scam website tricks you
into giving it permission to spend your tokens. PortalGuard warns you before you give that
permission. It also helps you find and cancel permissions you already gave, and it lets you
give apps small, time-limited permissions instead of unlimited ones.

Built for the Portaldot Network V3.0 Hacker House on DoraHacks.

- **Demo video:** _add your link here_
- **Network:** Portaldot V3 testnet. All four contracts are deployed; see [Deployed contracts](#deployed-contracts).

---

## Contents

- [The problem](#the-problem)
- [What PortalGuard does](#what-portalguard-does)
- [Deployed contracts](#deployed-contracts)
- [Quick start](#quick-start)
- [Try the live demo](#try-the-live-demo)
- [Install PortalGuard Shield](#install-portalguard-shield)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Limitations](#limitations)
- [References](#references)
- [Third-party code](#third-party-code)

---

## The problem

Wallet drainers are one of the most common ways people lose crypto, and the attacks are
still happening.

| When | What happened | Source |
|---|---|---|
| Oct 2026 | US prosecutors charged six people over fake NFT websites that asked victims for broad wallet permissions, then drained about **$517,000 from 74 wallets**. | Yahoo News / Wealth of Geeks; The Defiant |
| Oct 2026 | In one of those cases, a Maryland victim's **9,067 USDT** was gone about 33 minutes after it was deposited, through a permission granted on a fake NFT site. | Yahoo News / Wealth of Geeks |
| Aug 2024 | One holder lost **$55 million in DAI** after signing a single phishing transaction. | The Block |
| 2024 | Wallet drainers stole **$494 million from more than 332,000 wallets**, up 67% from 2023. **56.7%** of large losses came from one signed "Permit" approval. | Scam Sniffer, 2024 report |
| 2025 | Even in a quieter year, phishing still cost **106,000 victims $83.85 million**. | Scam Sniffer, 2025 report |
| May 2021 – Dec 2023 | About **$1 billion** was stolen through approval phishing alone. | Chainalysis |

Most of these attacks follow the same pattern:

1. A fake website offers an airdrop, a free NFT, or a reward.
2. The **Claim** button actually asks your wallet for an **unlimited approval**. That is
   permission for the attacker to move all of a token from your wallet, with no end date.
3. You click **Confirm**, because the wallet popup is hard to understand.
4. The attacker takes your tokens, sometimes right away, sometimes weeks later.

Blockchain transactions can't be reversed, so tokens that are stolen stay stolen. The only
real defence is to stop the permission from being given, or to limit what it allows.

## What PortalGuard does

PortalGuard protects you at three points: **before**, **after**, and **instead of** an
unlimited approval.

| Part | When it helps | What it does |
|---|---|---|
| **PortalGuard Shield** (browser extension) | **Before** you sign | Pauses risky wallet requests and explains them in plain language before your wallet opens. Checks the spender against the on-chain DrainerRegistry. |
| **Approval scanner** (web app) | **After** you sign | Lists every permission your wallet has given, rates the risk of each one, and cancels (revokes) any of them in one click. |
| **SafeApprove** (smart contract) | **Instead of** an unlimited approval | Gives an app a capped, expiring permission, such as "10 tUSD for 1 hour". A drainer can take at most the cap, and only until it expires. |
| **DrainerRegistry** (smart contract) | All of the above | A shared, on-chain list of known drainer addresses. Anyone can report one; confirmed drainers are flagged. |

### Key features

- **Plain-language warnings.** Shield catches three kinds of request:
  - unlimited `approve` and `increaseAllowance` requests
  - NFT "approve all" requests (`setApprovalForAll`)
  - gasless **Permit** signatures, the type behind the largest recent losses
- **Capped, expiring grants.** With SafeApprove, every permission has a maximum amount and
  an expiry time.
- **Lockdown.** One transaction cancels every SafeApprove grant you have ever made. Use it
  when you think your wallet is at risk.
- **Batch revoke.** Cancel many grants in one transaction.
- **Shareable scans.** Open the scanner with `?address=0x…` to share a wallet's risk report.

## Deployed contracts

All contracts are live on the **Portaldot V3 testnet**.

| Contract | Purpose | Address | Deployment transaction |
|---|---|---|---|
| DrainerRegistry | List of reported and flagged drainers | `0x96e57f7F7c2B44482BB1a95F6bc53134e2a411a1` | `0xa30ffcd93bdce9a68eeeb6bb579646306b2f42f6efc215e6d64b14454cb3d318` |
| SafeApprove | Capped, expiring permissions | `0x8ddbB4E933cc11E79Ed82799B263aF837Bf0DF0C` | `0x6374b8bc51ebaf3b4a1b4495e7d9ddd290242eef27c9fa74c423095b7ef8c2dc` |
| MockToken (tUSD) | Worthless test token for the demo | `0x69f76CfFE57cE57863bf78C33D0cb4818E73f0a9` | `0xd05b75c6353dba5a64c0dc562273ea8adfc525e8fbfc0569eccfa5b38dedc3c6` |
| DemoDrainer | Simulated attacker for the demo | `0x36a97Eceea628796EFFd9893866D0d4451eEC5c7` | `0xc7e0a2b5b37bfd0d290b9544743247a7d4b24483124e788266c84b4ec2b4eafb` |

You can look these up in the [Portaldot testnet explorer](https://scanner-testnet-v3.portaldot.dev/#/).
The same data is stored in [`deployments/portaldot.json`](deployments/portaldot.json).

### Network details

| Setting | Value |
|---|---|
| Network name | Portaldot V3 testnet |
| EVM RPC URL | `https://test-evm-rpc-v3.portaldot.dev` |
| Chain ID | `420420777` (hex `0x190f1ca9`) |
| Currency | tPOT |
| Explorer | `https://scanner-testnet-v3.portaldot.dev` |

When you connect, the web app adds this network to MetaMask for you.

## Quick start

### Requirements

- [Node.js](https://nodejs.org) 18 or later
- Chrome, Edge, or Brave, with [MetaMask](https://metamask.io) installed
- Some testnet tPOT in your MetaMask account, to pay transaction fees

### 1. Download the code

```bash
git clone https://github.com/Blucewill/PortalGuard.git
cd PortalGuard
npm install
```

### 2. Run the web app

```bash
cd web
npm install
npm run dev
```

Open the `localhost` link that appears in the terminal. The app is already set up to use the
deployed contracts, so you don't need to deploy anything to try it.

- **Scanner:** the home page
- **Live demo:** `/demo.html`

### 3. (Optional) Deploy your own copy

Only do this if you want your own contracts. Deploying costs several hundred tPOT.

```bash
cp .env.example .env        # then add a private key to .env
npm run deploy:portaldot
```

> **Warning:** Use a new wallet made only for testnet. Never put the key of a wallet that
> holds real funds in `.env`, and never commit `.env`. It is already listed in `.gitignore`.

The deploy script saves each address to `deployments/portaldot.json` as it goes. A deployment
can stop halfway, for example when the wallet runs out of tPOT. If that happens, run the
command again and it continues from where it stopped. At the end it prints a `CONTRACTS`
block to copy into `web/src/config.js`.

## Try the live demo

The demo page runs a real approval attack on the testnet, against your own wallet, using
worthless test tokens. **Use a separate MetaMask account for it.**

| Step | What you do | What you see |
|---|---|---|
| 1. Get test tokens | Click **Mint 1,000 tUSD**. | Your balance shows 1,000 tUSD. |
| 2. Fall for the trap | Click **Claim airdrop**. | If Shield is installed, a warning appears before MetaMask opens. Click **Cancel** and nothing is signed. |
| 3. The attack | Click **Claim airdrop** again, choose to continue, confirm in MetaMask, then click **Run the drainer**. | The drainer takes all of your tUSD. |
| 4. Scan and revoke | Mint more tokens, open the scanner, click **Revoke** on the flagged approval, then run the drainer again. | The drainer gets nothing. Tokens already stolen stay stolen. |
| 5. Cap the damage | Click **Use SafeApprove**, then **Run the drainer**. | The drainer can take only the 10 tUSD cap. |

The DemoDrainer contract refuses to deploy on any network except the Portaldot testnet or
a local test chain, so it can't be used against real funds.

## Install PortalGuard Shield

Shield isn't in the Chrome Web Store yet. Install it from the code:

1. Open `chrome://extensions` (or `edge://extensions`, or `brave://extensions`).
2. Turn on **Developer mode** (top-right corner).
3. Click **Load unpacked** and select the `extension` folder in this project.
4. Click the puzzle-piece icon in the toolbar and pin **PortalGuard Shield**.
5. Reload any open website tabs so Shield can start protecting them.

When a site asks for a risky permission, Shield shows an orange warning with two choices:

- **Cancel (recommended):** stops the request. Your wallet never opens.
- **I trust this site, continue to my wallet:** passes the request to your wallet unchanged.

Click the Shield icon to see how many warnings it has shown and how many requests you
cancelled.

More detail is in [`extension/README.md`](extension/README.md).

## How it works

### SafeApprove

Instead of approving an app directly, you approve SafeApprove once. Then you give each app
a **grant** with a limit and an expiry time:

```solidity
grant(token, spender, amount, expiresAt)  // e.g. 10 tUSD until one hour from now
```

The app collects tokens by calling `spend()` on SafeApprove. SafeApprove sends the tokens
only if all of the following are true:

- The grant exists and hasn't expired.
- The amount fits in what is left of the cap.
- The spender isn't flagged in the DrainerRegistry.

| Function | What it does |
|---|---|
| `grant(token, spender, amount, expiresAt)` | Gives an app a capped, expiring permission |
| `available(owner, token, spender)` | Shows how much an app can still take |
| `spend(owner, token, to, amount)` | Used by the app to collect tokens within its grant |
| `revoke(token, spender)` | Cancels one grant |
| `revokeMany(keys)` | Cancels many grants in one transaction |
| `lockdown()` | Cancels every grant you have made |

### DrainerRegistry

| Function | Who can call it | What it does |
|---|---|---|
| `report(suspect, reason)` | Anyone | Reports a suspicious address |
| `flag(suspect, reason)` | Registry owner | Marks an address as a confirmed drainer |
| `unflag(suspect)` | Registry owner | Removes a flag added by mistake |

SafeApprove, the scanner, and Shield all read this list.

### Approval scanner

1. The scanner reads every `Approval` and `ApprovalForAll` event your wallet has emitted on
   Portaldot. If the RPC limits how many blocks it can search at once, the scanner splits
   the search into smaller ranges.
2. It checks whether each approval is still active (`allowance`, `getApproved`,
   `isApprovedForAll`), because old approvals may already be used up or revoked.
3. It rates the risk of each active approval. These are rated high risk:
   - unlimited amounts
   - access to a whole NFT collection
   - a personal wallet as the spender
   - a reported drainer as the spender
4. You can revoke any approval from your wallet in one click.

### PortalGuard Shield

Every site talks to your wallet through the wallet's `request()` function. Shield runs inside
each web page and wraps that function, so it sees every request first. It decodes each one:

- **Token approvals** (`approve`, `increaseAllowance`): a warning if the amount is unlimited.
- **NFT approvals** (`setApprovalForAll(…, true)`): always a warning.
- **Permit signatures** (`eth_signTypedData_v3` / `v4`): always a warning.

On Portaldot, Shield also checks the spender against the DrainerRegistry and shows a red
**Known wallet drainer** warning when it is flagged. Two kinds of request pass straight
through, because they make you safer:

- revokes (approving 0)
- grants to SafeApprove

When several wallet extensions are installed, the web app uses the EIP-6963 standard to
pick MetaMask, so the extensions don't interfere with each other.

## Project structure

```
PortalGuard/
├── contracts/
│   ├── SafeApprove.sol        # Capped, expiring permissions
│   ├── DrainerRegistry.sol    # Shared list of known drainers
│   ├── demo/DemoDrainer.sol   # Simulated attacker (testnet only)
│   └── test/MockToken.sol     # Test token (tUSD)
├── scripts/deploy.js          # Deploys all contracts; resumes if interrupted
├── deployments/portaldot.json # Deployed addresses and transaction hashes
├── test/                      # Contract tests
├── web/                       # Scanner and live demo (React + Vite)
│   ├── index.html             # Scanner
│   ├── demo.html              # Live demo
│   └── src/config.js          # Network settings and contract addresses
└── extension/                 # PortalGuard Shield (Chrome, Manifest V3)
```

## Testing

Run these commands from the project's root folder.

| Command | What it tests | Number of tests |
|---|---|---|
| `npm test` | Smart contracts, on a local simulated chain | 14 |
| `npm run test:extension` | Shield's request-detection logic | 8 |

All tests pass.

## Limitations

PortalGuard is a hackathon project. These are its known limits:

- **Shield is a safety net, not a guarantee.** It runs in the same page as the website, so a
  determined malicious site could try to get around it. Building the same checks into the
  wallet itself would close this gap.
- **Revoking doesn't return stolen tokens.** It only stops future theft.
- **SafeApprove needs app support.** Its grants apply only when an app collects tokens
  through SafeApprove. Until apps adopt it, the scanner and Shield protect regular approvals.
- **The DrainerRegistry has one owner,** who confirms flags. A production version would use
  community voting or several reviewers.
- **Testnet only.** The contracts haven't been audited.

## References

- Yahoo News / Wealth of Geeks (29 Oct 2026). *Fake Dating Profiles Led Americans to NFT Sites That Drained Their Crypto.*
- The Defiant (Oct 2026). *US Charges Six in Alleged Madagascar NFT Wallet-Draining Scheme.*
- The Block (Aug 2024). [*Crypto whale loses $55 million in Dai stablecoin to phishing attack.*](https://www.theblock.co/post/312326)
- Scam Sniffer (2025). [*2024 Web3 Phishing Attacks: Wallet Drainers Drain $494 Million.*](https://drops.scamsniffer.io/?p=971)
- Scam Sniffer (2026). *2025 Crypto Phishing Losses Fall 83% to $84 Million.*
- BleepingComputer (Jan 2025). *Cryptocurrency wallet drainers stole $494 million in 2024.*
- Chainalysis (Dec 2023). *Approval phishing: about $1 billion stolen since May 2021.*

## Third-party code

- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) (MIT)
- [Hardhat](https://hardhat.org) (MIT)
- [ethers.js](https://docs.ethers.org) (MIT)
- [React](https://react.dev) and [Vite](https://vite.dev) (MIT)

## License

MIT, as declared in `package.json`.
