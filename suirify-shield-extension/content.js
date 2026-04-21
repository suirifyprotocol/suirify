function detectPolicyLinks() {
  const anchors = Array.from(document.querySelectorAll("a[href]"));
  const matches = anchors
    .map((anchor) => ({
      text: (anchor.textContent || "").trim(),
      href: anchor.href,
    }))
    .filter((item) => {
      const combined = `${item.text} ${item.href}`.toLowerCase();
      return (
        combined.includes("privacy") ||
        combined.includes("terms") ||
        combined.includes("policy") ||
        combined.includes("conditions")
      );
    })
    .slice(0, 5);

  return matches;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "SUIRIFY_DETECT_POLICY_LINKS") {
    sendResponse({
      url: window.location.href,
      title: document.title,
      policyLinks: detectPolicyLinks(),
    });
    return true;
  }

  return false;
});
