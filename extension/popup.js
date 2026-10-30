chrome.storage.local.get({ warned: 0, cancelled: 0 }).then(({ warned, cancelled }) => {
  document.getElementById("warned").textContent = warned;
  document.getElementById("cancelled").textContent = cancelled;
});
