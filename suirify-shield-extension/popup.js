const mockByLanguage = {
  EN: {
    riskScore: 71,
    summary:
      "This policy includes broad third-party sharing language and unclear data retention timelines.",
    flaggedClauses: [
      {
        title: "Third-Party Data Sharing",
        reference: "NDPA 2023 - Lawful Basis and Data Minimization",
        recommendation: "Restrict data sharing to explicit consent scopes.",
      },
      {
        title: "Undefined Data Retention",
        reference: "NDPA 2023 - Storage Limitation",
        recommendation: "Specify fixed retention and deletion windows.",
      },
    ],
    gap: "Suirify gap: biometric handling and consent proof obligations are not clearly stated.",
  },
  PIDGIN: {
    riskScore: 69,
    summary:
      "Dis policy no clear well-well for data sharing and how long dem go keep your personal data.",
    flaggedClauses: [
      {
        title: "Sharing with third parties",
        reference: "NDPA 2023 - Lawful Basis",
        recommendation: "Make user permission clear before sharing.",
      },
      {
        title: "No clear retention period",
        reference: "NDPA 2023 - Storage Limitation",
        recommendation: "Show exact time for keeping and deleting data.",
      },
    ],
    gap: "Suirify gap: no clear biometric rules and consent evidence statement.",
  },
  YORUBA: {
    riskScore: 66,
    summary:
      "Ilana yi ko salaye ni kedere lori pipa data pelu awon egbe keta ati akoko ipamo data.",
    flaggedClauses: [
      {
        title: "Ipin data pelu egbe keta",
        reference: "NDPA 2023 - Lawful Basis",
        recommendation: "Fi iforuko-inu olumulo han gbangba ki o to pin data.",
      },
      {
        title: "Akoko ipamo data ko ye",
        reference: "NDPA 2023 - Storage Limitation",
        recommendation: "Salaye akoko gangan fun ipamo ati piparẹ data.",
      },
    ],
    gap: "Suirify gap: ko si alaye to ye lori data biometrics ati eri iforuko-inu.",
  },
};

const languageEl = document.getElementById("language");
const analyzeButton = document.getElementById("analyzeButton");
const resultEl = document.getElementById("result");
const riskScoreEl = document.getElementById("riskScore");
const summaryEl = document.getElementById("summary");
const flagsEl = document.getElementById("flags");
const gapEl = document.getElementById("gap");
const metaEl = document.getElementById("meta");
const siteRowEl = document.getElementById("siteRow");

const languageLabels = {
  EN: "EN",
  PIDGIN: "Pidgin",
  YORUBA: "Yoruba",
};

function render(language, context) {
  const analysis = mockByLanguage[language] || mockByLanguage.EN;
  riskScoreEl.textContent = String(analysis.riskScore);
  summaryEl.textContent = analysis.summary;
  flagsEl.innerHTML = "";
  siteRowEl.innerHTML = "";

  analysis.flaggedClauses.forEach((clause) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${clause.title}</strong><br>${clause.reference}<br>${clause.recommendation}`;
    flagsEl.appendChild(item);
  });

  gapEl.textContent = analysis.gap;
  siteRowEl.innerHTML = `
    <span class="chip">Site: ${context.url || "Unknown"}</span>
    <span class="chip">Language: ${languageLabels[language] || language}</span>
    <span class="chip">Policy links: ${context.policyLinks.length}</span>
  `;
  metaEl.textContent = context.policyLinks.length
    ? `Detected policy-like links: ${context.policyLinks.map((link) => link.text || link.href).join(" • ")}`
    : "No policy-like links were found on this page.";
  resultEl.hidden = false;
}

async function analyzeCurrentTab() {
  const language = languageEl.value;
  await chrome.storage.local.set({ lastLanguage: language });

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const context = {
    url: activeTab && activeTab.url ? activeTab.url : "",
    policyLinks: [],
  };

  if (activeTab && activeTab.id) {
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type: "SUIRIFY_DETECT_POLICY_LINKS",
      });
      if (response && Array.isArray(response.policyLinks)) {
        context.policyLinks = response.policyLinks;
      }
      if (response && response.url) {
        context.url = response.url;
      }
    } catch (_err) {
      // Ignore pages where content script cannot execute (e.g. chrome:// pages).
    }
  }

  render(language, context);
}

(async function init() {
  const saved = await chrome.storage.local.get(["lastLanguage"]);
  if (saved.lastLanguage && mockByLanguage[saved.lastLanguage]) {
    languageEl.value = saved.lastLanguage;
  }

  analyzeButton.textContent = `Analyze This Site (${languageLabels[languageEl.value] || languageEl.value})`;

  languageEl.addEventListener("change", () => {
    analyzeButton.textContent = `Analyze This Site (${languageLabels[languageEl.value] || languageEl.value})`;
  });

  analyzeButton.addEventListener("click", analyzeCurrentTab);
})();
