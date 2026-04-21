// Suirify Shield Extension - Enhanced Popup Script
// Integrates ClauseLens functionality with Suirify design and Azure AI

// Mock data for different languages (will be replaced with Azure AI API calls)
const mockAnalysisByLanguage = {
  EN: {
    riskScore: 71,
    severity: 'caution',
    summary: 'This policy includes broad third-party sharing language and unclear data retention timelines for personal data.',
    flaggedClauses: [
      {
        title: 'Third-Party Data Sharing',
        description: 'Policy allows sharing user information with trusted partners for analytics, advertising, and operational services without explicit consent.',
        severity: 'high',
        reference: 'NDPA 2023 - Lawful Basis and Data Minimization'
      },
      {
        title: 'Undefined Data Retention',
        description: 'No clear timeline specified for how long personal data will be retained.',
        severity: 'medium',
        reference: 'NDPA 2023 - Storage Limitation'
      },
      {
        title: 'Biometric Data Processing',
        description: 'Vague language around biometric data handling and storage practices.',
        severity: 'high',
        reference: 'NDPA 2023 - Sensitive Data Protection'
      }
    ],
    suirifyGap: 'Policy does not clearly state biometric processing controls or explicit NDPA consent proof requirements. Suirify provides cryptographic consent and zero-PII storage for biometric verification.'
  },
  PIDGIN: {
    riskScore: 69,
    severity: 'caution',
    summary: 'Dis policy no clear well-well for data sharing and how long dem go keep your personal data.',
    flaggedClauses: [
      {
        title: 'Sharing with third parties',
        description: 'Dem fit share your information with other companies for adverts and analytics without you knowing.',
        severity: 'high',
        reference: 'NDPA 2023 - Lawful Basis'
      },
      {
        title: 'No clear retention period',
        description: 'Dem no talk how long dem go keep your data.',
        severity: 'medium',
        reference: 'NDPA 2023 - Storage Limitation'
      },
      {
        title: 'Biometric data wahala',
        description: 'Dem no explain well how dem go handle your face and fingerprint data.',
        severity: 'high',
        reference: 'NDPA 2023 - Sensitive Data Protection'
      }
    ],
    suirifyGap: 'Dem never explain well how dem handle biometric data and consent proof under NDPA. Suirify dey use cryptographic consent and no dey store your biometric data.'
  },
  YORUBA: {
    riskScore: 66,
    severity: 'caution',
    summary: 'Ilana yi ko salaye ni kedere lori pipa data pelu awon egbe keta ati akoko ipamo data.',
    flaggedClauses: [
      {
        title: 'Ipin data pelu egbe keta',
        description: 'Won le pin alaye re pelu awon ile-ise miiran fun ipolowo ati itupalẹ laisi iforuko-inu rẹ.',
        severity: 'high',
        reference: 'NDPA 2023 - Lawful Basis'
      },
      {
        title: 'Akoko ipamo data ko ye',
        description: 'Won ko salaye akoko ti won yoo fi ipamo data rẹ.',
        severity: 'medium',
        reference: 'NDPA 2023 - Storage Limitation'
      },
      {
        title: 'Isoro data biometrics',
        description: 'Won ko salaye daradara bi won se n tọju data oju ati ika ọwọ rẹ.',
        severity: 'high',
        reference: 'NDPA 2023 - Sensitive Data Protection'
      }
    ],
    suirifyGap: 'Ko si alaye kedere lori bi won se n tọju data biometrics ati eri iforuko-inu NDPA. Suirify n lo iforuko-inu cryptographic ati ko fi data biometric pamọ.'
  }
};

// DOM Elements
const elements = {
  language: document.getElementById('language'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  btnText: document.getElementById('btnText'),
  btnIcon: document.getElementById('btnIcon'),
  btnLoader: document.getElementById('btnLoader'),
  loadingState: document.getElementById('loadingState'),
  resultsSection: document.getElementById('resultsSection'),
  statusDot: document.getElementById('statusDot'),
  statusIndicator: document.getElementById('statusIndicator'),
  siteInfo: document.getElementById('siteInfo'),
  siteUrl: document.getElementById('siteUrl'),
  analysisMeta: document.getElementById('analysisMeta'),
  riskScore: document.getElementById('riskScore'),
  riskBadge: document.getElementById('riskBadge'),
  riskScoreFill: document.getElementById('riskScoreFill'),
  summaryText: document.getElementById('summaryText'),
  clausesList: document.getElementById('clausesList'),
  gapText: document.getElementById('gapText'),
  newAnalysisBtn: document.getElementById('newAnalysisBtn'),
  viewFullBtn: document.getElementById('viewFullBtn')
};

// State
let currentUrl = '';
let currentAnalysis = null;

// Initialize
async function init() {
  // Load saved language preference
  const saved = await chrome.storage.local.get(['lastLanguage']);
  if (saved.lastLanguage && mockAnalysisByLanguage[saved.lastLanguage]) {
    elements.language.value = saved.lastLanguage;
  }

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    currentUrl = tab.url;
    updateStatusIndicator(tab.url);
  }

  // Event listeners
  elements.analyzeBtn.addEventListener('click', handleAnalyze);
  elements.language.addEventListener('change', handleLanguageChange);
  elements.newAnalysisBtn.addEventListener('click', resetAnalysis);
  elements.viewFullBtn.addEventListener('click', openFullReport);

  // Check if we have cached analysis for this URL
  await checkCachedAnalysis();
}

// Update status indicator based on URL
function updateStatusIndicator(url) {
  // Simple heuristic for demo - in production, this would check cached analysis
  const hostname = new URL(url).hostname;
  
  // Known safe domains
  const safeDomains = ['github.com', 'google.com', 'microsoft.com'];
  // Known risky domains (for demo)
  const riskyDomains = ['example-risky.com'];
  
  let status = 'caution'; // default yellow
  
  if (safeDomains.some(domain => hostname.includes(domain))) {
    status = 'safe';
  } else if (riskyDomains.some(domain => hostname.includes(domain))) {
    status = 'danger';
  }
  
  elements.statusDot.className = `status-dot ${status}`;
}

// Check for cached analysis
async function checkCachedAnalysis() {
  const cacheKey = `analysis_${currentUrl}_${elements.language.value}`;
  const cached = await chrome.storage.local.get([cacheKey]);
  
  if (cached[cacheKey]) {
    currentAnalysis = cached[cacheKey];
    displayResults(currentAnalysis);
  }
}

// Handle language change
async function handleLanguageChange() {
  const language = elements.language.value;
  await chrome.storage.local.set({ lastLanguage: language });
  
  // If we have current analysis, re-render in new language
  if (currentAnalysis) {
    await handleAnalyze();
  }
}

// Handle analyze button click
async function handleAnalyze() {
  const language = elements.language.value;
  
  // Show loading state
  elements.analyzeBtn.classList.add('loading');
  elements.analyzeBtn.disabled = true;
  elements.loadingState.hidden = false;
  elements.resultsSection.hidden = true;
  
  try {
    // Simulate API call delay (replace with actual Azure AI API call)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get analysis (mock data for now - replace with Azure AI API)
    const analysis = await getAnalysis(currentUrl, language);
    
    // Cache the result
    const cacheKey = `analysis_${currentUrl}_${language}`;
    await chrome.storage.local.set({ [cacheKey]: analysis });
    
    currentAnalysis = analysis;
    displayResults(analysis);
    
    // Update badge icon based on risk
    updateBadgeIcon(analysis.riskScore);
    
  } catch (error) {
    console.error('Analysis failed:', error);
    alert('Analysis failed. Please try again.');
  } finally {
    elements.analyzeBtn.classList.remove('loading');
    elements.analyzeBtn.disabled = false;
    elements.loadingState.hidden = true;
  }
}

// Get analysis (mock - replace with Azure AI API)
async function getAnalysis(url, language) {
  // In production, this would call Azure AI API
  // For now, return mock data
  const analysis = mockAnalysisByLanguage[language] || mockAnalysisByLanguage.EN;
  
  return {
    ...analysis,
    url: url,
    timestamp: Date.now(),
    language: language
  };
}

// Display results
function displayResults(analysis) {
  // Hide loading, show results
  elements.loadingState.hidden = true;
  elements.resultsSection.hidden = false;
  
  // Site info
  const hostname = new URL(analysis.url).hostname;
  elements.siteUrl.textContent = hostname;
  elements.analysisMeta.textContent = `Analyzed ${new Date(analysis.timestamp).toLocaleTimeString()} • ${analysis.language}`;
  
  // Risk score
  elements.riskScore.textContent = analysis.riskScore;
  elements.riskScoreFill.style.width = `${analysis.riskScore}%`;
  
  // Risk badge
  const badgeText = analysis.riskScore <= 30 ? 'SAFE' : 
                    analysis.riskScore <= 70 ? 'CAUTION' : 'RISKY';
  const badgeClass = analysis.riskScore <= 30 ? 'safe' : 
                     analysis.riskScore <= 70 ? 'caution' : 'danger';
  
  elements.riskBadge.textContent = badgeText;
  elements.riskBadge.className = `risk-badge ${badgeClass}`;
  
  // Update status dot
  elements.statusDot.className = `status-dot ${badgeClass}`;
  
  // Summary
  elements.summaryText.textContent = analysis.summary;
  
  // Flagged clauses
  elements.clausesList.innerHTML = '';
  analysis.flaggedClauses.forEach((clause, index) => {
    const clauseEl = createClauseElement(clause, index);
    elements.clausesList.appendChild(clauseEl);
  });
  
  // Suirify gap
  elements.gapText.textContent = analysis.suirifyGap;
}

// Create clause element
function createClauseElement(clause, index) {
  const div = document.createElement('div');
  div.className = `clause-item severity-${clause.severity}`;
  div.style.animationDelay = `${index * 0.05}s`;
  
  div.innerHTML = `
    <div class="clause-header">
      <div class="clause-title">${clause.title}</div>
      <span class="clause-severity ${clause.severity}">${clause.severity}</span>
    </div>
    <p class="clause-description">${clause.description}</p>
    <p class="clause-reference">${clause.reference}</p>
  `;
  
  return div;
}

// Update badge icon (for extension icon)
function updateBadgeIcon(riskScore) {
  const color = riskScore <= 30 ? '#22c55e' : 
                riskScore <= 70 ? '#f59e0b' : '#ef4444';
  
  chrome.action.setBadgeBackgroundColor({ color: color });
  chrome.action.setBadgeText({ text: String(riskScore) });
}

// Reset analysis
function resetAnalysis() {
  currentAnalysis = null;
  elements.resultsSection.hidden = true;
  elements.analyzeBtn.classList.remove('loading');
  elements.analyzeBtn.disabled = false;
  
  // Reset badge
  chrome.action.setBadgeText({ text: '' });
}

// Open full report
function openFullReport() {
  // In production, this would open a full report page
  // For now, open Suirify dashboard
  const dashboardUrl = 'http://localhost:5173/dashboard/extension';
  chrome.tabs.create({ url: dashboardUrl });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYSIS_COMPLETE') {
    currentAnalysis = message.analysis;
    displayResults(message.analysis);
    sendResponse({ success: true });
  }
  return true;
});
