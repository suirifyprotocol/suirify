// Suirify Shield Extension - Enhanced Background Service Worker
// Handles automatic policy detection and traffic light indicator

// Configuration
const CONFIG = {
  AZURE_AI_ENDPOINT: 'https://your-azure-endpoint.openai.azure.com',
  AZURE_AI_KEY: 'your-api-key-here', // In production, use secure storage
  AUTO_ANALYZE_DELAY: 3000, // Wait 3s after page load before auto-analyzing
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
};

// Risk thresholds for traffic light
const RISK_THRESHOLDS = {
  SAFE: 30,
  CAUTION: 70
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Suirify Shield installed');
  
  // Set default badge
  chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // Yellow/caution by default
});

// Listen for tab updates (page loads)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Auto-analyze after delay
    setTimeout(() => {
      autoAnalyzeTab(tabId, tab.url);
    }, CONFIG.AUTO_ANALYZE_DELAY);
  }
});

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    updateBadgeForTab(activeInfo.tabId, tab.url);
  }
});

// Auto-analyze tab
async function autoAnalyzeTab(tabId, url) {
  try {
    // Skip chrome:// and extension pages
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return;
    }
    
    // Check cache first
    const cached = await getCachedAnalysis(url);
    if (cached) {
      updateBadgeFromAnalysis(tabId, cached);
      return;
    }
    
    // Detect policy links on the page
    const policyLinks = await detectPolicyLinks(tabId);
    
    if (policyLinks.length > 0) {
      // Perform quick risk assessment
      const quickRisk = await performQuickRiskAssessment(url, policyLinks);
      
      // Update badge
      updateBadgeFromRisk(tabId, quickRisk);
      
      // Cache the quick assessment
      await cacheAnalysis(url, { riskScore: quickRisk, timestamp: Date.now() });
    } else {
      // No policy found - set to caution (yellow)
      updateBadgeFromRisk(tabId, 50);
    }
  } catch (error) {
    console.error('Auto-analyze failed:', error);
    // Set to caution on error
    updateBadgeFromRisk(tabId, 50);
  }
}

// Detect policy links on page
async function detectPolicyLinks(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const policyKeywords = [
          'privacy', 'policy', 'terms', 'conditions', 'legal',
          'cookie', 'data protection', 'gdpr', 'ndpa'
        ];
        
        const links = Array.from(document.querySelectorAll('a'));
        const policyLinks = links.filter(link => {
          const text = link.textContent.toLowerCase();
          const href = link.href.toLowerCase();
          return policyKeywords.some(keyword => 
            text.includes(keyword) || href.includes(keyword)
          );
        }).map(link => ({
          text: link.textContent.trim(),
          href: link.href
        }));
        
        return policyLinks;
      }
    });
    
    return results[0]?.result || [];
  } catch (error) {
    console.error('Failed to detect policy links:', error);
    return [];
  }
}

// Perform quick risk assessment
async function performQuickRiskAssessment(url, policyLinks) {
  // In production, this would call Azure AI API for quick assessment
  // For now, use heuristics
  
  const hostname = new URL(url).hostname;
  
  // Known safe domains
  const safeDomains = [
    'github.com', 'google.com', 'microsoft.com', 'apple.com',
    'mozilla.org', 'wikipedia.org', 'stackoverflow.com'
  ];
  
  // Known risky patterns
  const riskyPatterns = [
    'free-download', 'click-here', 'win-prize', 'survey',
    'adult', 'gambling', 'crypto-earn'
  ];
  
  // Check if domain is known safe
  if (safeDomains.some(domain => hostname.includes(domain))) {
    return 20; // Low risk (green)
  }
  
  // Check for risky patterns
  if (riskyPatterns.some(pattern => hostname.includes(pattern))) {
    return 85; // High risk (red)
  }
  
  // Check policy link count (more policies = potentially more complex/risky)
  if (policyLinks.length === 0) {
    return 60; // Medium-high risk (no policy found)
  } else if (policyLinks.length > 5) {
    return 55; // Medium risk (many policies)
  }
  
  // Default to medium-low risk
  return 40; // Caution (yellow)
}

// Update badge from risk score
function updateBadgeFromRisk(tabId, riskScore) {
  let color, text;
  
  if (riskScore <= RISK_THRESHOLDS.SAFE) {
    color = '#22c55e'; // Green
    text = '✓';
  } else if (riskScore <= RISK_THRESHOLDS.CAUTION) {
    color = '#f59e0b'; // Yellow
    text = '!';
  } else {
    color = '#ef4444'; // Red
    text = '⚠';
  }
  
  chrome.action.setBadgeBackgroundColor({ color: color, tabId: tabId });
  chrome.action.setBadgeText({ text: text, tabId: tabId });
}

// Update badge from full analysis
function updateBadgeFromAnalysis(tabId, analysis) {
  updateBadgeFromRisk(tabId, analysis.riskScore);
}

// Update badge for current tab
async function updateBadgeForTab(tabId, url) {
  const cached = await getCachedAnalysis(url);
  if (cached) {
    updateBadgeFromAnalysis(tabId, cached);
  } else {
    // Set to caution while we don't have analysis
    updateBadgeFromRisk(tabId, 50);
  }
}

// Cache analysis
async function cacheAnalysis(url, analysis) {
  const cacheKey = `analysis_${url}`;
  await chrome.storage.local.set({ 
    [cacheKey]: {
      ...analysis,
      cachedAt: Date.now()
    }
  });
}

// Get cached analysis
async function getCachedAnalysis(url) {
  const cacheKey = `analysis_${url}`;
  const result = await chrome.storage.local.get([cacheKey]);
  const cached = result[cacheKey];
  
  if (!cached) return null;
  
  // Check if cache is still valid
  const age = Date.now() - cached.cachedAt;
  if (age > CONFIG.CACHE_DURATION) {
    // Cache expired
    await chrome.storage.local.remove([cacheKey]);
    return null;
  }
  
  return cached;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_URL') {
    handleAnalyzeRequest(message.url, message.language)
      .then(analysis => sendResponse({ success: true, analysis }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'GET_POLICY_LINKS') {
    detectPolicyLinks(sender.tab.id)
      .then(links => sendResponse({ success: true, links }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Handle full analysis request from popup
async function handleAnalyzeRequest(url, language) {
  // Check cache first
  const cacheKey = `full_analysis_${url}_${language}`;
  const cached = await chrome.storage.local.get([cacheKey]);
  
  if (cached[cacheKey]) {
    const age = Date.now() - cached[cacheKey].timestamp;
    if (age < CONFIG.CACHE_DURATION) {
      return cached[cacheKey];
    }
  }
  
  // Perform full analysis with Azure AI
  // In production, this would call Azure OpenAI API
  // For now, return mock data
  const analysis = await performFullAnalysis(url, language);
  
  // Cache the result
  await chrome.storage.local.set({ [cacheKey]: analysis });
  
  return analysis;
}

// Perform full analysis (mock - replace with Azure AI)
async function performFullAnalysis(url, language) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock data (replace with actual Azure AI API call)
  const mockData = {
    EN: {
      riskScore: 71,
      severity: 'caution',
      summary: 'This policy includes broad third-party sharing language and unclear data retention timelines.',
      flaggedClauses: [
        {
          title: 'Third-Party Data Sharing',
          description: 'Policy allows sharing user information with partners without explicit consent.',
          severity: 'high',
          reference: 'NDPA 2023 - Lawful Basis'
        },
        {
          title: 'Undefined Data Retention',
          description: 'No clear timeline for data retention specified.',
          severity: 'medium',
          reference: 'NDPA 2023 - Storage Limitation'
        }
      ],
      suirifyGap: 'Policy lacks clear biometric processing controls and NDPA consent requirements.'
    },
    PIDGIN: {
      riskScore: 69,
      severity: 'caution',
      summary: 'Dis policy no clear well-well for data sharing and retention.',
      flaggedClauses: [
        {
          title: 'Sharing with third parties',
          description: 'Dem fit share your info without asking you.',
          severity: 'high',
          reference: 'NDPA 2023 - Lawful Basis'
        }
      ],
      suirifyGap: 'Dem never explain biometric handling and consent proof.'
    },
    YORUBA: {
      riskScore: 66,
      severity: 'caution',
      summary: 'Ilana yi ko salaye kedere lori pipa data.',
      flaggedClauses: [
        {
          title: 'Ipin data pelu egbe keta',
          description: 'Won le pin alaye re laisi iforuko-inu.',
          severity: 'high',
          reference: 'NDPA 2023 - Lawful Basis'
        }
      ],
      suirifyGap: 'Ko si alaye kedere lori data biometrics.'
    }
  };
  
  const data = mockData[language] || mockData.EN;
  
  return {
    ...data,
    url: url,
    timestamp: Date.now(),
    language: language
  };
}

// Clean up old cache periodically
chrome.alarms.create('cleanCache', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanCache') {
    cleanOldCache();
  }
});

async function cleanOldCache() {
  const storage = await chrome.storage.local.get(null);
  const now = Date.now();
  const keysToRemove = [];
  
  for (const [key, value] of Object.entries(storage)) {
    if (key.startsWith('analysis_') || key.startsWith('full_analysis_')) {
      if (value.cachedAt && (now - value.cachedAt > CONFIG.CACHE_DURATION)) {
        keysToRemove.push(key);
      }
    }
  }
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    console.log(`Cleaned ${keysToRemove.length} expired cache entries`);
  }
}
