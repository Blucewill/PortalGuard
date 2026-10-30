# PortalGuard Shield (browser extension)

Warns you **before** your wallet opens when a website asks for a permission a drainer could abuse:

- an **unlimited token approval** (`approve` / `increaseAllowance`)
- **"approve all" for NFTs** (`setApprovalForAll`)
- a **Permit signature** (`eth_signTypedData_v4` / `v3`), the gasless kind behind most large drainer losses

On Portaldot it also checks the spender against the live **DrainerRegistry**
(`0x96e57f7F7c2B44482BB1a95F6bc53134e2a411a1`) and shows a red "Known wallet drainer" warning when it is flagged.
Revokes (approve 0) and approvals to PortalGuard's own SafeApprove contract pass straight through.

## Install (Chrome, Edge, Brave)

1. Open `chrome://extensions` and switch on **Developer mode** (top right).
2. Click **Load unpacked** and choose this `extension` folder.
3. Pin **PortalGuard Shield** from the puzzle-piece menu.

## How it works

`inject.js` runs inside each page next to the site's own code and wraps the wallet's `request()` function.
Risky requests are paused and explained; **Cancel** returns the standard "user rejected" error (code 4001),
**continue** hands the request to the wallet unchanged. `detect.js` holds the decision logic as pure functions;
`background.js` does the registry lookup; `bridge.js` relays between the two.

A determined malicious page runs in the same context and could try to bypass the wrapper, so Shield is a
safety net, not a guarantee. Wallet-level integration is the next step.

## Tests

```
npm run test:extension
```
