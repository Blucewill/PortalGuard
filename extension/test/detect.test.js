// Run with: node --test extension/test
const test = require("node:test");
const assert = require("node:assert");
const { analyzeRequest, PORTALDOT_CHAIN_ID } = require("../detect.js");

const TOKEN = "0x69f76cffe57ce57863bf78c33d0cb4818e73f0a9";
const DRAINER = "0x36a97eceea628796effd9893866d0d4451eec5c7";
const SAFE_APPROVE = "0x8ddbb4e933cc11e79ed82799b263af837bf0df0c";

const pad = (hex) => hex.replace(/^0x/, "").padStart(64, "0");
const MAX = "f".repeat(64);
const tx = (selector, spender, amountHex) => ({ to: TOKEN, data: selector + pad(spender) + pad(amountHex) });

test("flags an unlimited approve as high risk", () => {
  const f = analyzeRequest("eth_sendTransaction", [tx("0x095ea7b3", DRAINER, MAX)], PORTALDOT_CHAIN_ID);
  assert.equal(f.kind, "token-approval");
  assert.equal(f.spender, DRAINER);
  assert.equal(f.token, TOKEN);
  assert.equal(f.unlimited, true);
  assert.equal(f.risk, "high");
});

test("flags a limited approve as medium risk", () => {
  const f = analyzeRequest("eth_sendTransaction", [tx("0x095ea7b3", DRAINER, (10n ** 19n).toString(16))], PORTALDOT_CHAIN_ID);
  assert.equal(f.unlimited, false);
  assert.equal(f.risk, "medium");
});

test("ignores revokes (approve 0)", () => {
  assert.equal(analyzeRequest("eth_sendTransaction", [tx("0x095ea7b3", DRAINER, "0")], PORTALDOT_CHAIN_ID), null);
});

test("trusts SafeApprove on Portaldot only", () => {
  assert.equal(analyzeRequest("eth_sendTransaction", [tx("0x095ea7b3", SAFE_APPROVE, MAX)], PORTALDOT_CHAIN_ID), null);
  assert.notEqual(analyzeRequest("eth_sendTransaction", [tx("0x095ea7b3", SAFE_APPROVE, MAX)], 1), null);
});

test("flags setApprovalForAll(true) but not (false)", () => {
  assert.equal(analyzeRequest("eth_sendTransaction", [tx("0xa22cb465", DRAINER, "1")], PORTALDOT_CHAIN_ID).kind, "nft-approval-all");
  assert.equal(analyzeRequest("eth_sendTransaction", [tx("0xa22cb465", DRAINER, "0")], PORTALDOT_CHAIN_ID), null);
});

test("ignores ordinary transfers and calls", () => {
  assert.equal(analyzeRequest("eth_sendTransaction", [{ to: TOKEN, value: "0x1" }], PORTALDOT_CHAIN_ID), null);
  assert.equal(analyzeRequest("eth_sendTransaction", [{ to: TOKEN, data: "0xa9059cbb" + pad(DRAINER) + pad("1") }], PORTALDOT_CHAIN_ID), null);
  assert.equal(analyzeRequest("eth_accounts", [], PORTALDOT_CHAIN_ID), null);
});

test("flags Permit signatures, including Permit2 and string params", () => {
  const permit = {
    primaryType: "Permit",
    domain: { verifyingContract: TOKEN },
    message: { owner: "0x1", spender: DRAINER, value: (2n ** 256n - 1n).toString(), deadline: "9999999999" },
  };
  const f = analyzeRequest("eth_signTypedData_v4", ["0xowner", JSON.stringify(permit)], PORTALDOT_CHAIN_ID);
  assert.equal(f.kind, "permit-signature");
  assert.equal(f.spender, DRAINER);
  assert.equal(f.unlimited, true);

  const permit2 = { primaryType: "PermitSingle", domain: {}, message: { spender: DRAINER, details: { token: TOKEN, amount: "5" } } };
  const g = analyzeRequest("eth_signTypedData_v4", ["0xowner", permit2], PORTALDOT_CHAIN_ID);
  assert.equal(g.unlimited, false);
  assert.equal(g.token, TOKEN);
});

test("ignores non-permit typed data and malformed input", () => {
  assert.equal(analyzeRequest("eth_signTypedData_v4", ["0xowner", JSON.stringify({ primaryType: "Mail", message: {} })], 1), null);
  assert.equal(analyzeRequest("eth_signTypedData_v4", ["0xowner", "not json"], 1), null);
  assert.equal(analyzeRequest("eth_sendTransaction", [{ to: TOKEN, data: "0x095ea7b3" }], 1), null);
});
