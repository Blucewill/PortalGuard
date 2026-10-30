// PortalGuard Shield: relays messages between the page (inject.js) and the extension.
// Content scripts in the page's MAIN world can't call chrome.* APIs; this isolated one can.
window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.source !== "portalguard-page") return;
  const { id, type, payload } = e.data;
  chrome.runtime.sendMessage({ type, payload }, (result) => {
    window.postMessage({ source: "portalguard-ext", id, result: chrome.runtime.lastError ? null : result }, "*");
  });
});
