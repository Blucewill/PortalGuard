export const PORTALDOT = {
  chainId: 420420777,
  chainIdHex: "0x190f1ca9",
  name: "Portaldot Testnet V3",
  rpcUrl: "https://test-evm-rpc-v3.portaldot.dev",
  currency: { name: "POT", symbol: "POT", decimals: 18 },
};

// Filled in after deploying the contracts (npm run deploy:portaldot in the project root).
// While null, the scanner skips the drainer-registry check and the demo page shows a notice.
export const CONTRACTS = {
  drainerRegistry: "0x96e57f7F7c2B44482BB1a95F6bc53134e2a411a1",
  safeApprove: "0x8ddbB4E933cc11E79Ed82799B263aF837Bf0DF0C",
  demoToken: null,
  demoDrainer: null,
};

// A testnet wallet that already has approvals, so the scanner can be tried without connecting.
export const SAMPLE_ADDRESS = "0x11d9f0ca1da31bb54752bf0f43b7ba51110752b7";
