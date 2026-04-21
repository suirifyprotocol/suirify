// Suirify Shield Extension - Enhanced Content Script
// Detects policy links and provides page-level functionality

(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    POLICY_KEYWORDS: [
      'privacy', 'policy', 'policies', 'terms', 'conditions',
      'legal', 'cookie', 'cookies', 'data protection', 'gdpr',
      'ndpa', 'compliance', 'agreement', 'disclaimer'
    ],
    SCAN_DELAY: 2000, // Wait 2s after page load
  };
  
  // State
  let policyLinks = [];
  let hasScanned = false;
  
  // Initialize
  function init() {
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(scanPage, CONFIG.SCAN_DELAY);
      });
    } else {
      setTimeout(scanPage, CONFIG.SCAN_DELAY);
    }
  }
  
  // Scan page for policy links
  function scanPage() {
    if (hasScanned) return;
    hasScanned = true;
    
    try {
      policyLinks = detectPolicyLinks();
      
      // Send results to background script
      chrome.runtime.sendMessage({
        type: 'POLICY_LINKS_DETECTED',
        links: policyLinks,
        url: window.location.href
      });
      
      // Optionally highlight policy links (for debugging)
      if (false) { // Set to true to enable highlighting
        highlightPolicyLinks();
      }
    } catch (error) {
      console.error('Suirify Shield: Failed to scan page', error);
    }
  }
  
  // Detect policy links on the page
  function detectPolicyLinks() {
    const links = [];
    const seenHrefs = new Set();
    
    // Find all links
    const allLinks = document.querySelectorAll('a[href]');
    
    allLinks.forEach(link => {
      const text = link.textContent.trim().toLowerCase();
      const href = link.href.toLowerCase();
      const title = (link.title || '').toLowerCase();
      const ariaLabel = (link.getAttribute('aria-label') || '').toLowerCase();
      
      // Check if link matches policy keywords
      const matchesKeyword = CONFIG.POLICY_KEYWORDS.some(keyword => {
        return text.includes(keyword) || 
               href.includes(keyword) || 
               title.includes(keyword) ||
               ariaLabel.includes(keyword);
      });
      
      if (matchesKeyword && !seenHrefs.has(link.href)) {
        seenHrefs.add(link.href);
        
        links.push({
          text: link.textContent.trim(),
          href: link.href,
          title: link.title,
          position: getLinkPosition(link)
        });
      }
    });
    
    return links;
  }
  
  // Get link position on page
  function getLinkPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      visible: isElementVisible(element)
    };
  }
  
  // Check if element is visible
  function isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth) &&
      window.getComputedStyle(element).display !== 'none' &&
      window.getComputedStyle(element).visibility !== 'hidden'
    );
  }
  
  // Highlight policy links (for debugging)
  function highlightPolicyLinks() {
    const allLinks = document.querySelectorAll('a[href]');
    
    allLinks.forEach(link => {
      const text = link.textContent.trim().toLowerCase();
      const href = link.href.toLowerCase();
      
      const matchesKeyword = CONFIG.POLICY_KEYWORDS.some(keyword => {
        return text.includes(keyword) || href.includes(keyword);
      });
      
      if (matchesKeyword) {
        link.style.outline = '2px solid #5eb3d4';
        link.style.outlineOffset = '2px';
        link.setAttribute('data-suirify-policy-link', 'true');
      }
    });
  }
  
  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_POLICY_LINKS') {
      if (!hasScanned) {
        scanPage();
      }
      sendResponse({ 
        success: true, 
        links: policyLinks,
        url: window.location.href
      });
      return true;
    }
    
    if (message.type === 'HIGHLIGHT_POLICY_LINKS') {
      highlightPolicyLinks();
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'SCROLL_TO_POLICY') {
      const link = policyLinks.find(l => l.href === message.href);
      if (link) {
        window.scrollTo({
          top: link.position.top - 100,
          behavior: 'smooth'
        });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Link not found' });
      }
      return true;
    }
  });
  
  // Extract policy text from page (if on a policy page)
  function extractPolicyText() {
    // Common selectors for policy content
    const selectors = [
      'article',
      '[role="main"]',
      '.policy-content',
      '.terms-content',
      '.privacy-content',
      'main',
      '#content',
      '.content'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.innerText;
      }
    }
    
    // Fallback to body text
    return document.body.innerText;
  }
  
  // Check if current page is a policy page
  function isPolicyPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    
    return CONFIG.POLICY_KEYWORDS.some(keyword => {
      return url.includes(keyword) || title.includes(keyword);
    });
  }
  
  // Auto-extract policy if on policy page
  if (isPolicyPage()) {
    // Wait for page to load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const policyText = extractPolicyText();
        
        // Send to background for analysis
        chrome.runtime.sendMessage({
          type: 'POLICY_TEXT_EXTRACTED',
          text: policyText,
          url: window.location.href
        });
      }, 1000);
    });
  }
  
  // Initialize
  init();
  
})();
