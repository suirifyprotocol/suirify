# Suirify Shield - Enhanced Chrome Extension

**AI-Powered Policy Analysis with NDPA Compliance**  
*Powered by Microsoft Azure AI*

---

## 🎯 Overview

Suirify Shield is an enhanced Chrome extension that automatically analyzes website privacy policies and terms of service using Microsoft Azure AI. It provides real-time risk assessment with a traffic light indicator and supports multiple languages including English, Pidgin, and Yoruba.

### Key Features

✅ **Traffic Light Indicator** - Green/Yellow/Red badge shows risk level without opening extension  
✅ **Automatic Policy Detection** - Scans pages for privacy policies and terms  
✅ **AI-Powered Analysis** - Uses Microsoft Azure AI for comprehensive risk assessment  
✅ **Multi-Language Support** - English, Pidgin, and Yoruba translations  
✅ **NDPA Compliance** - Flags clauses against Nigeria Data Protection Act 2023  
✅ **Suirify Design System** - Consistent with Suirify frontend branding  
✅ **Responsive UI** - Works on all screen sizes  
✅ **Smart Caching** - Reduces API calls and improves performance  

---

## 🚀 Installation

### Development Mode

1. **Clone the repository**
   ```bash
   cd c:\Users\HP\Desktop\SUIRIFYPROTOCOL\suirify\suirify-shield-extension
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load Extension**
   - Click "Load unpacked"
   - Select the `suirify-shield-extension` folder
   - Extension icon appears in toolbar

4. **Pin Extension** (Optional)
   - Click puzzle icon in Chrome toolbar
   - Pin Suirify Shield for easy access

---

## 🎨 Design System

The extension uses Suirify's design system for consistency:

### Colors

- **Background Primary**: `#0a1419` (Dark blue-black)
- **Background Secondary**: `#0b1220` (Slightly lighter)
- **Accent Primary**: `#5eb3d4` (Suirify blue)
- **Accent Mint**: `#abf0da` (Mint green for CTAs)
- **Risk Low**: `#22c55e` (Green)
- **Risk Medium**: `#f59e0b` (Yellow/Orange)
- **Risk High**: `#ef4444` (Red)

### Typography

- **Display Font**: Audiowide (headings)
- **Body Font**: Inter (content)
- **Monospace**: System monospace (code/data)

### Components

All UI components match Suirify frontend:
- Rounded corners (8px-20px)
- Subtle borders with transparency
- Gradient backgrounds
- Smooth transitions and animations

---

## 🚦 Traffic Light Indicator

The extension badge shows risk level at a glance:

| Color | Symbol | Risk Level | Score Range |
|-------|--------|------------|-------------|
| 🟢 Green | ✓ | Safe | 0-30 |
| 🟡 Yellow | ! | Caution | 31-70 |
| 🔴 Red | ⚠ | Risky | 71-100 |

### How It Works

1. **Automatic Scanning** - Extension scans page 3 seconds after load
2. **Policy Detection** - Finds privacy policy and terms links
3. **Quick Assessment** - Performs heuristic risk check
4. **Badge Update** - Updates icon color and symbol
5. **Background Monitoring** - Continues monitoring as you browse

---

## 📊 Analysis Features

### Risk Score Card

- **Large Score Display** - 0-100 risk score
- **Visual Progress Bar** - Color-coded risk indicator
- **Risk Badge** - SAFE/CAUTION/RISKY label
- **Animated Transitions** - Smooth score updates

### Flagged Clauses

Each flagged clause shows:
- **Title** - Brief description
- **Severity** - High/Medium/Low badge
- **Description** - Detailed explanation
- **NDPA Reference** - Relevant regulation clause

### Suirify Gap Analysis

Highlights what the policy lacks compared to Suirify's standards:
- Biometric data handling
- Cryptographic consent
- Zero-PII storage
- NDPA compliance requirements

---

## 🌍 Language Support

### English (EN)
Full technical analysis with regulatory references.

### Pidgin
Simplified Nigerian Pidgin English for accessibility:
- "Dem fit share your data" (They can share your data)
- "No clear retention period" (Unclear how long data is kept)

### Yoruba
Native Yoruba translations:
- "Ipin data pelu egbe keta" (Data sharing with third parties)
- "Ko si alaye kedere" (No clear explanation)

---

## 🔧 Technical Architecture

### Files Structure

```
suirify-shield-extension/
├── manifest-v2.json          # Enhanced manifest with badge support
├── popup-v2.html             # Enhanced popup UI
├── popup-v2.css              # Suirify design system styles
├── popup-v2.js               # Popup logic with Azure AI
├── background-v2.js          # Service worker with traffic light
├── content-v2.js             # Content script for policy detection
├── icons/                    # Extension icons (16, 32, 48, 128)
└── README-ENHANCED.md        # This file
```

### Key Components

**Manifest V3**
- Permissions: activeTab, tabs, storage, scripting
- Background service worker
- Content scripts on all URLs
- Dynamic badge updates

**Popup (popup-v2.html/js/css)**
- Responsive 420px width
- Suirify color scheme
- Animated transitions
- Language selector
- Results display

**Background Worker (background-v2.js)**
- Auto-analyzes pages on load
- Updates badge based on risk
- Caches analysis results
- Cleans old cache periodically

**Content Script (content-v2.js)**
- Detects policy links
- Extracts policy text
- Sends data to background
- Optional link highlighting

---

## 🤖 Azure AI Integration

### Current Implementation

The extension is designed to integrate with Microsoft Azure OpenAI:

```javascript
const CONFIG = {
  AZURE_AI_ENDPOINT: 'https://your-azure-endpoint.openai.azure.com',
  AZURE_AI_KEY: 'your-api-key-here',
};
```

### API Call Structure

```javascript
async function analyzeWithAzure(policyText, language) {
  const response = await fetch(`${CONFIG.AZURE_AI_ENDPOINT}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': CONFIG.AZURE_AI_KEY
    },
    body: JSON.stringify({
      text: policyText,
      language: language,
      frameworks: ['NDPA_2023', 'GDPR'],
      output_format: 'structured'
    })
  });
  
  return await response.json();
}
```

### Mock Data (Current)

For development, the extension uses mock data that simulates Azure AI responses. Replace with actual API calls in production.

---

## 📦 Deployment Checklist

### Before Publishing

- [ ] Replace mock data with Azure AI API calls
- [ ] Add Azure API key to secure storage
- [ ] Test on multiple websites
- [ ] Verify all 3 languages work
- [ ] Test traffic light on different risk levels
- [ ] Optimize icon sizes (16, 32, 48, 128px)
- [ ] Add privacy policy link
- [ ] Test cache expiration
- [ ] Verify NDPA references are accurate
- [ ] Run accessibility audit

### Chrome Web Store

1. Create developer account
2. Prepare store listing:
   - Screenshots (1280x800 or 640x400)
   - Promotional images
   - Detailed description
   - Privacy policy URL
3. Upload extension ZIP
4. Submit for review

---

## 🧪 Testing Guide

### Manual Testing

1. **Traffic Light**
   - Visit github.com → Should show green ✓
   - Visit unknown site → Should show yellow !
   - Check badge updates when switching tabs

2. **Popup Analysis**
   - Click extension icon
   - Click "Analyze This Site"
   - Verify risk score displays
   - Check flagged clauses appear
   - Test language toggle

3. **Language Support**
   - Select "Pidgin" → Click Analyze
   - Verify text changes to Pidgin
   - Select "Yoruba" → Click Analyze
   - Verify text changes to Yoruba

4. **Caching**
   - Analyze a site
   - Close popup
   - Reopen popup
   - Should load instantly from cache

### Automated Testing

```javascript
// Test risk calculation
function testRiskCalculation() {
  assert(calculateRisk(20) === 'safe');
  assert(calculateRisk(50) === 'caution');
  assert(calculateRisk(80) === 'danger');
}

// Test policy detection
function testPolicyDetection() {
  const links = detectPolicyLinks();
  assert(links.length > 0);
  assert(links[0].href.includes('privacy'));
}
```

---

## 🔐 Security & Privacy

### Data Handling

- **No PII Storage** - Extension never stores personal data
- **Local Processing** - Policy text processed locally when possible
- **Secure API Calls** - Azure AI calls use HTTPS
- **Cache Encryption** - Sensitive cache data encrypted
- **No Tracking** - Extension doesn't track user behavior

### Permissions Justification

- **activeTab** - Read current page URL and content
- **tabs** - Update badge for each tab
- **storage** - Cache analysis results
- **scripting** - Inject content script for policy detection

---

## 📝 Changelog

### Version 2.0.0 (Enhanced)

**New Features:**
- ✨ Traffic light indicator (green/yellow/red badge)
- ✨ Automatic policy detection on page load
- ✨ Suirify design system integration
- ✨ Enhanced responsive UI
- ✨ Smart caching with expiration
- ✨ Multi-language support (EN/Pidgin/Yoruba)
- ✨ Azure AI integration structure
- ✨ Animated transitions and loading states

**Improvements:**
- 🎨 Complete UI redesign matching Suirify frontend
- ⚡ Faster analysis with background processing
- 📱 Better mobile/small screen support
- 🔄 Auto-refresh badge when switching tabs
- 💾 Improved cache management

**Bug Fixes:**
- Fixed badge not updating on tab switch
- Fixed language selector not persisting
- Fixed popup width on small screens

---

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes
4. Test thoroughly
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open Pull Request

### Code Style

- Use ES6+ features
- Follow Suirify design system
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable names

---

## 📞 Support

**Issues:** Open an issue on GitHub  
**Email:** support@suirify.com  
**Documentation:** https://github.com/suirifyprotocol/suirify/wiki  

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **Microsoft Azure AI** - AI analysis engine
- **Suirify Team** - Design system and branding
- **ClauseLens** - Original policy analysis concept
- **NDPA 2023** - Regulatory framework

---

**Built with ❤️ by the Suirify Team**  
*Verify your identity. Guard your data. Understand what you sign.*

---

## 🔗 Quick Links

- [Suirify Website](http://localhost:5173)
- [Compliance Dashboard](http://localhost:5173/dashboard/compliance)
- [Regulator Dashboard](http://localhost:5173/dashboard/regulator)
- [Extension Preview](http://localhost:5173/dashboard/extension)
- [GitHub Repository](https://github.com/suirifyprotocol/suirify)

---

**Last Updated:** 2026-04-21  
**Version:** 2.0.0  
**Status:** ✅ Ready for Testing
