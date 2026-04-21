chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    lastLanguage: "EN",
  });
});
