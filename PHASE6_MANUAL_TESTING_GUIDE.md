# Suirify Phase 6 Manual Testing Guide
**Quick Reference for Final QA & Demo Rehearsal**

---

## 🚀 Quick Start

```bash
# Terminal 1: Start Frontend
cd frontend
npm run dev
# Open: http://localhost:5173

# Terminal 2: Start Backend (optional, mock fallback works)
cd backend
npm run dev
# Runs on: http://localhost:4000
```

---

## ✅ Test Checklist (30 Minutes)

### 1. Happy Path Verification Flow (5 min)
**Route:** `http://localhost:5173/verify`

**Steps:**
1. [ ] Page loads without errors
2. [ ] Connect wallet button visible
3. [ ] Click through verification steps
4. [ ] Progress animation shows all 5 stages
5. [ ] Success result displays attestation ID
6. [ ] All 4 frameworks listed (CBN, NDPA, NITDA, SEC)
7. [ ] Expiry date shown
8. [ ] Claims checklist visible

**Expected:** Smooth flow, no console errors, all animations working

---

### 2. Error Code Testing (10 min)
**Route:** `http://localhost:5173/dashboard/qa`

**Test Each Code:**
- [ ] `NIN_NOT_FOUND` - Shows guidance, retry button
- [ ] `FACE_MATCH_FAILED` - Shows guidance, retry button
- [ ] `LIVENESS_FAILED` - Shows guidance, retry button
- [ ] `AGE_BELOW_18` - Shows guidance, NO retry button
- [ ] `MAX_RETRIES_EXCEEDED` - Shows guidance, NO retry button
- [ ] `NIN_ALREADY_ATTESTED` - Shows guidance, NO retry button
- [ ] `CONSENT_DENIED` - Shows guidance, retry button

**Expected:** Each error shows proper title, message, guidance, and correct retry state

---

### 3. Compliance Dashboard (5 min)
**Route:** `http://localhost:5173/dashboard/compliance`

**Verify Widgets:**
- [ ] KYC Rate card shows percentage
- [ ] Active Attestations card shows number
- [ ] Expired Attestations card shows number
- [ ] Failed Verifications card shows number
- [ ] AI Confidence bars render (Face Match + Liveness)
- [ ] Monthly Volume chart shows 6 months
- [ ] Framework Crosswalk table shows 4 frameworks
- [ ] Recent Failures log shows 3 entries with confidence scores
- [ ] Export Audit Pack button visible
- [ ] "Zero PII enforced" badge visible
- [ ] No wallet addresses or names displayed

**Expected:** All widgets render, data looks realistic, no PII visible

---

### 4. Regulator Dashboard (5 min)
**Route:** `http://localhost:5173/dashboard/regulator`

**Verify Widgets:**
- [ ] Ecosystem stats: 48,291 users, 23 platforms, 91.7% compliance, 47 fraud signals
- [ ] Platform compliance heatmap shows 3 platforms with progress bars
- [ ] Live fraud signals feed shows 3 signals
- [ ] Fraud signals rotate every 5 seconds (wait and observe)
- [ ] Expiring attestations alerts show 3 platforms
- [ ] Framework summary shows 4 frameworks with percentages
- [ ] "Zero PII | NDPA Compliant" badge in HEADER
- [ ] "Zero PII | NDPA Compliant" badge in FOOTER
- [ ] No wallet addresses or personal names displayed

**Expected:** All widgets render, fraud signals auto-rotate, zero PII visible

---

### 5. Chrome Extension (5 min)

**Load Extension:**
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select: `suirify-shield-extension/` folder
5. Extension icon appears in toolbar

**Test Popup:**
- [ ] Click extension icon
- [ ] Popup opens with "Suirify Shield" header
- [ ] Language dropdown shows EN, Pidgin, Yoruba
- [ ] "Powered by Microsoft Azure" badge visible (top)
- [ ] "NDPA-aware" badge visible
- [ ] Click "Analyze This Site"
- [ ] Risk score displays (0-100)
- [ ] Summary text appears
- [ ] Flagged clauses list appears (2 items)
- [ ] NDPA references shown
- [ ] Suirify gap text appears
- [ ] "Powered by Microsoft Azure" badge visible (bottom)

**Test Language Toggle:**
- [ ] Switch to "Pidgin" → Click Analyze → Text changes to Pidgin
- [ ] Switch to "Yoruba" → Click Analyze → Text changes to Yoruba
- [ ] Switch back to "EN" → Click Analyze → Text changes to English

**Test on Real Websites:**
- [ ] Visit `https://google.com` → Analyze → Shows result
- [ ] Visit `https://github.com` → Analyze → Shows result
- [ ] Visit `https://twitter.com` → Analyze → Shows result

**Expected:** Extension loads, popup works, all 3 languages work, analysis displays

---

## 🎬 Demo Rehearsal Script (2 Minutes)

### Slide 1: Landing Page (10 seconds)
**Route:** `http://localhost:5173/`

**Say:**
> "This is Suirify — Nigeria's AI-powered identity compliance infrastructure. One verification. Five frameworks. Zero PII."

**Action:** Scroll briefly, then click "Verify"

---

### Slide 2: Verification Flow (30 seconds)
**Route:** `http://localhost:5173/verify`

**Say:**
> "A Nigerian user connects their Sui wallet, submits their NIN and selfie once. Watch the AI pipeline."

**Action:** 
- Click through steps quickly
- When progress animation shows, say:
> "NIMC NIN API validates identity. Azure Face API matches the selfie. Azure Liveness Detection confirms a real human. PII is deleted immediately. Rules Engine makes the final decision."

**Action:** Wait for success result

**Say:**
> "One attestation. Four frameworks satisfied. Zero PII on-chain. This user never uploads their NIN again."

---

### Slide 3: Compliance Dashboard (20 seconds)
**Route:** `http://localhost:5173/dashboard/compliance`

**Say:**
> "This is Amaka's view — the Compliance Officer. She sees her platform's KYC posture in real time. Azure AI confidence scores. Framework coverage. Audit pack ready for CBN in one click."

**Action:** Scroll to show widgets, hover over Export button

---

### Slide 4: Regulator Dashboard (30 seconds)
**Route:** `http://localhost:5173/dashboard/regulator`

**Say:**
> "This is Director Chidi's view — the NITDA regulator. He sees the entire ecosystem. 48,000 verified users across 23 platforms. Live fraud signals from Azure AI. Watch — they update every 5 seconds."

**Action:** Wait 5 seconds to show fraud signal rotation

**Say:**
> "Zero PII. Always current. This is the SupTech layer Nigeria doesn't have today."

**Action:** Point to "Zero PII | NDPA Compliant" badges

---

### Slide 5: Chrome Extension (30 seconds)
**Action:** Click extension icon in browser toolbar

**Say:**
> "Most Nigerians accept Terms & Conditions blindly. Suirify Shield reads and analyzes them automatically. AI flags risky clauses against NDPA."

**Action:** Select "Pidgin" from dropdown, click "Analyze This Site"

**Say:**
> "Plain English. Pidgin. Yoruba. Powered by Microsoft Azure. You verified your identity with Suirify. Now let Suirify verify the internet back."

**Action:** Close popup

---

### Closing (10 seconds)
**Say:**
> "Suirify. Verify once. Use everywhere. Zero PII. Built on Sui. Powered by Microsoft Azure. Thank you."

---

## ⏱️ Timing Targets

| Section | Target Time | Max Time |
|---------|-------------|----------|
| Landing | 10s | 15s |
| Verification | 30s | 40s |
| Compliance Dashboard | 20s | 25s |
| Regulator Dashboard | 30s | 35s |
| Extension | 30s | 35s |
| Closing | 10s | 10s |
| **TOTAL** | **2:10** | **2:40** |

---

## 🔧 Troubleshooting

### Frontend won't start
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### Extension won't load
1. Check manifest.json is valid
2. Ensure all files (popup.html, popup.js, content.js, background.js) exist
3. Try removing and re-adding extension

### Routes show blank screen
1. Check browser console for errors
2. Verify React Router is working
3. Check if mock data files exist

### Animations not working
1. Check if `isAnimated` prop is true
2. Verify CSS animations are not disabled
3. Try hard refresh (Ctrl+Shift+R)

---

## 📋 Pre-Demo Checklist

**30 Minutes Before:**
- [ ] Frontend dev server running
- [ ] All routes tested and working
- [ ] Extension loaded and tested
- [ ] Browser cache cleared
- [ ] Demo script printed/visible
- [ ] Backup screenshots ready
- [ ] Internet connection stable
- [ ] Screen recording started (optional)

**5 Minutes Before:**
- [ ] Close unnecessary browser tabs
- [ ] Close unnecessary applications
- [ ] Set browser zoom to 100%
- [ ] Disable browser notifications
- [ ] Have demo script visible
- [ ] Take deep breath 😊

---

## 🎯 Success Criteria

**Demo is successful if:**
1. ✅ All 5 routes load without errors
2. ✅ Verification progress animation plays smoothly
3. ✅ Both dashboards render all widgets
4. ✅ Extension popup works and shows analysis
5. ✅ Demo completes under 2:30
6. ✅ Zero PII claim is visible and emphasized
7. ✅ Azure branding is visible throughout

**Demo is EXCELLENT if:**
- All above criteria met
- Fraud signals visibly rotate during Regulator Dashboard section
- Language toggle demonstrated in extension
- Confidence scores emphasized during verification
- Delivered with confidence and clarity

---

## 📞 Emergency Contacts

**If something breaks during demo:**
1. **Stay calm** - You have mock data fallback
2. **Use screenshots** - Have backup slides ready
3. **Explain the concept** - The idea matters more than the demo
4. **Emphasize the architecture** - Talk through the 5-layer stack

**Remember:** Judges care about:
- Problem understanding ✅
- Solution architecture ✅
- AI integration (Azure) ✅
- Regulatory alignment ✅
- Demo polish (nice to have)

---

**Good luck! You've got this! 🚀**

**Last Updated:** 2026-04-21  
**Status:** Ready for Phase 6 Testing
