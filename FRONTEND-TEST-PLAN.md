# 🎯 SUIRIFY FRONTEND - Complete Test Plan

**Test all dashboards and verification flow built during Phase 7 & 8**

---

## 🚀 QUICK START - Run Frontend

### Step 1: Start Development Server

```bash
cd c:\Users\HP\Desktop\SUIRIFYPROTOCOL\suirify\frontend
npm run dev
```

**Expected Output:**
```
> suirify-frontend@1.0.0 dev
> vite

  VITE v7.2.7  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Action:** Open browser to `http://localhost:5173/`

---

## ✅ TEST CHECKLIST - All Routes

### 1. Landing Page (/)
**URL:** `http://localhost:5173/`

**What to Test:**
- [ ] Page loads without errors
- [ ] Hero section displays
- [ ] "Verify your identity" title visible
- [ ] Navigation menu works
- [ ] "Build with Suirify" button visible
- [ ] Quick links to dashboards visible:
  - Compliance Dashboard
  - Regulator Dashboard
  - Shield Preview
  - QA Harness
- [ ] Suirify branding consistent
- [ ] Background image loads
- [ ] Responsive on mobile (resize browser)

**Expected Design:**
- Dark background (#0a1419)
- Suirify blue accents (#5eb3d4)
- Mint green buttons (#abf0da)
- Audiowide font for headings

---

### 2. Verification Flow (/verify)
**URL:** `http://localhost:5173/verify`

**What to Test:**
- [ ] Page loads without errors
- [ ] Verification steps visible
- [ ] Can navigate through steps
- [ ] Wallet connect option shows
- [ ] Step indicators work
- [ ] Progress tracking visible

**Steps to Test:**
1. Click through each verification step
2. Check step transitions are smooth
3. Verify step icons display correctly
4. Test back/forward navigation

---

### 3. Compliance Dashboard (/dashboard/compliance)
**URL:** `http://localhost:5173/dashboard/compliance`

**What to Test:**

#### Header Section
- [ ] Title: "Compliance Officer Dashboard"
- [ ] Platform ID displayed
- [ ] Last updated timestamp
- [ ] "Mock-first demo" badge
- [ ] "Zero PII enforced" badge
- [ ] "Export Audit Pack" button

#### KPI Cards (Top Row)
- [ ] **KYC Rate** - Shows percentage (e.g., 91.7%)
- [ ] **Active Attestations** - Shows number (e.g., 1,824)
- [ ] **Expired Attestations** - Shows number (e.g., 136)
- [ ] **Failed Verifications** - Shows number (e.g., 47)

#### AI Confidence Monitoring
- [ ] **Azure Face Match Avg** - Progress bar with percentage
- [ ] **Azure Liveness Avg** - Progress bar with percentage
- [ ] Both bars animate on load
- [ ] Percentages display correctly

#### Monthly Verification Volume Chart
- [ ] 6 months of data displayed (Nov-Apr)
- [ ] Bar chart shows verified vs failed counts
- [ ] Bars are color-coded
- [ ] Hover shows exact numbers

#### Framework Crosswalk Table
- [ ] Table displays 4 frameworks:
  - CBN_KYC_2023
  - NDPA_2023
  - NITDA_COP_2022
  - SEC_2024
- [ ] Pass rates shown for each
- [ ] Required claims listed
- [ ] Table is scrollable if needed

#### Recent Failures Log
- [ ] Shows 3 recent failures
- [ ] Each failure shows:
  - Error code
  - Timestamp
  - Rules engine result
  - Face match confidence
  - Liveness confidence
  - Platform ID badge
  - "Confidence-driven" badge

#### Audit Pack Status
- [ ] Shows "Ready for export"
- [ ] Description text visible

#### Zero PII Guardrail
- [ ] Confirmation text visible
- [ ] No wallet addresses shown anywhere
- [ ] No personal names shown anywhere

**Design Check:**
- [ ] Dark background consistent
- [ ] Cards have subtle borders
- [ ] Rounded corners (14px)
- [ ] Proper spacing between sections
- [ ] Responsive layout (test by resizing)

---

### 4. Regulator Dashboard (/dashboard/regulator)
**URL:** `http://localhost:5173/dashboard/regulator`

**What to Test:**

#### Header Section
- [ ] Title: "Regulator SupTech Dashboard"
- [ ] Subtitle: "Ecosystem-wide posture with zero personally identifiable data"
- [ ] **"Zero PII | NDPA Compliant"** badge in header (TOP)

#### Ecosystem Stats Cards (Top Row)
- [ ] **Total Verified Users** - 48,291
- [ ] **Integrated Platforms** - 23
- [ ] **Compliance Rate** - 91.7%
- [ ] **Fraud Signals** - 47

#### Platform Compliance Heatmap
- [ ] Shows 3 platforms:
  - fintech_alpha
  - defi_beta
  - wallet_gamma
- [ ] Each platform has:
  - Compliance score percentage
  - Progress bar (color-coded)
  - Verification count
  - Fraud signals count
- [ ] Progress bars animate on load

#### Live AI Fraud Signals Feed
- [ ] Shows 3 fraud signals
- [ ] Each signal shows:
  - Signal type (deepfake_attempt, duplicate_nin, etc.)
  - Severity badge (HIGH/MEDIUM/LOW)
  - Platform ID
  - Timestamp
  - Azure confidence score
  - "Rules Engine: FLAGGED" text
- [ ] **CRITICAL:** Signals rotate every 5 seconds
  - Watch for 10 seconds to see rotation
  - First signal should move to bottom
  - New order should appear

#### Expiring Attestation Alerts
- [ ] Shows 3 platforms with expiring attestations
- [ ] Each shows:
  - Platform ID
  - Days until expiry (7, 14, 30)
  - Count of expiring attestations

#### Framework Compliance Summary
- [ ] Shows 4 frameworks with percentages:
  - CBN_KYC_2023 → 92%
  - NDPA_2023 → 97%
  - NITDA_COP_2022 → 94%
  - SEC_2024 → 90%

#### Footer Section
- [ ] **"Zero PII | NDPA Compliant"** badge in footer (BOTTOM)
- [ ] Generated timestamp displayed
- [ ] Border separator visible

**Design Check:**
- [ ] Different gradient background than Compliance
- [ ] No wallet addresses visible anywhere
- [ ] No personal names visible anywhere
- [ ] Badges are cyan/mint colored
- [ ] Fraud signals have severity colors

**CRITICAL TEST:**
- [ ] **Wait 5 seconds** - Fraud signals should auto-rotate
- [ ] **Wait 10 seconds** - Should see 2 rotations
- [ ] Order changes but no page refresh

---

### 5. Extension Preview (/dashboard/extension)
**URL:** `http://localhost:5173/dashboard/extension`

**What to Test:**
- [ ] Page loads without errors
- [ ] Extension preview/demo visible
- [ ] Shows extension functionality
- [ ] Installation instructions (if any)
- [ ] Screenshots or mockups display

---

### 6. QA Harness (/dashboard/qa)
**URL:** `http://localhost:5173/dashboard/qa`

**What to Test:**

#### Error Code Testing
- [ ] Page shows all 7 error codes:
  1. NIN_NOT_FOUND
  2. FACE_MATCH_FAILED
  3. LIVENESS_FAILED
  4. AGE_BELOW_18
  5. MAX_RETRIES_EXCEEDED
  6. NIN_ALREADY_ATTESTED
  7. CONSENT_DENIED

#### For Each Error Code:
- [ ] Button to trigger error
- [ ] Error displays with:
  - Title
  - Message
  - Guidance text
  - Retry button (if retryable)
  - Rules engine result
- [ ] Retryable errors show retry button
- [ ] Non-retryable errors don't show retry button

**Test Each Error:**
1. Click "Test NIN_NOT_FOUND"
   - [ ] Error displays
   - [ ] Shows guidance
   - [ ] Retry button visible

2. Click "Test FACE_MATCH_FAILED"
   - [ ] Error displays
   - [ ] Shows guidance
   - [ ] Retry button visible

3. Click "Test LIVENESS_FAILED"
   - [ ] Error displays
   - [ ] Shows guidance
   - [ ] Retry button visible

4. Click "Test AGE_BELOW_18"
   - [ ] Error displays
   - [ ] Shows guidance
   - [ ] NO retry button (not retryable)

5. Click "Test MAX_RETRIES_EXCEEDED"
   - [ ] Error displays
   - [ ] Shows guidance
   - [ ] NO retry button (not retryable)

6. Click "Test NIN_ALREADY_ATTESTED"
   - [ ] Error displays
   - [ ] Shows guidance
   - [ ] NO retry button (not retryable)

7. Click "Test CONSENT_DENIED"
   - [ ] Error displays
   - [ ] Shows guidance
   - [ ] Retry button visible

---

## 🎨 DESIGN CONSISTENCY CHECK

### Colors (Check Across All Pages)
- [ ] **Background Primary:** #0a1419 (dark blue-black)
- [ ] **Background Secondary:** #0b1220 (slightly lighter)
- [ ] **Accent Primary:** #5eb3d4 (Suirify blue)
- [ ] **Accent Mint:** #abf0da (CTA buttons)
- [ ] **Text Primary:** #ffffff (white)
- [ ] **Text Secondary:** rgba(255, 255, 255, 0.85)

### Typography
- [ ] **Headings:** Audiowide font
- [ ] **Body:** Inter font
- [ ] **Sizes:** Consistent across pages

### Components
- [ ] **Buttons:** Mint green with hover lift effect
- [ ] **Cards:** Dark background with subtle borders
- [ ] **Badges:** Colored with transparency
- [ ] **Borders:** Rounded corners (12-16px)

---

## 📱 RESPONSIVE TESTING

### Desktop (1920x1080)
- [ ] All dashboards display correctly
- [ ] No horizontal scroll
- [ ] Cards align properly
- [ ] Text is readable

### Tablet (768x1024)
- [ ] Layout adjusts
- [ ] Cards stack if needed
- [ ] Navigation still works
- [ ] Text remains readable

### Mobile (375x667)
- [ ] Single column layout
- [ ] Cards stack vertically
- [ ] Buttons are tappable
- [ ] No content cut off

**How to Test:**
1. Press F12 (DevTools)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select different devices
4. Test each dashboard

---

## ⚡ PERFORMANCE CHECK

### Load Times
- [ ] Landing page loads < 2 seconds
- [ ] Dashboards load < 3 seconds
- [ ] No visible lag when switching routes
- [ ] Animations are smooth (60fps)

### Console Errors
- [ ] Press F12 to open console
- [ ] Check for red errors
- [ ] Should see no critical errors
- [ ] Warnings are acceptable

### Network Tab
- [ ] Check if mock data loads
- [ ] No failed requests (404s)
- [ ] Assets load correctly

---

## 🔄 NAVIGATION TESTING

### Route Switching
Test clicking between all routes:
```
/ → /verify → /dashboard/compliance → /dashboard/regulator → /dashboard/extension → /dashboard/qa → /
```

**Check:**
- [ ] All routes load without errors
- [ ] Back button works
- [ ] Forward button works
- [ ] URL updates correctly
- [ ] Page title updates

### Quick Links (From Landing Page)
- [ ] Click "Compliance Dashboard" → Goes to /dashboard/compliance
- [ ] Click "Regulator Dashboard" → Goes to /dashboard/regulator
- [ ] Click "Shield Preview" → Goes to /dashboard/extension
- [ ] Click "QA Harness" → Goes to /dashboard/qa

---

## 🎯 CRITICAL FEATURES TO VERIFY

### 1. Mock Data Working
- [ ] All dashboards show data (not loading forever)
- [ ] Numbers are realistic
- [ ] Charts display correctly
- [ ] Tables populate

### 2. Zero PII Enforcement
- [ ] **Compliance Dashboard:** No wallet addresses or names
- [ ] **Regulator Dashboard:** No wallet addresses or names
- [ ] Only aggregate data shown
- [ ] Platform IDs are generic (fintech_alpha, not real names)

### 3. Azure Branding
- [ ] "Powered by Microsoft Azure" mentioned
- [ ] Azure confidence scores visible
- [ ] Azure Face API referenced in metrics

### 4. NDPA Compliance
- [ ] "NDPA Compliant" badges visible
- [ ] "Zero PII" badges visible
- [ ] Framework references include NDPA_2023

### 5. Auto-Refresh (Regulator Dashboard)
- [ ] Fraud signals rotate every 5 seconds
- [ ] No page refresh needed
- [ ] Smooth transition between signals

---

## 📊 DATA VALIDATION

### Compliance Dashboard
- [ ] KYC Rate: 91.7%
- [ ] Active Attestations: 1,824
- [ ] Expired Attestations: 136
- [ ] Failed Verifications: 47
- [ ] Avg Face Match: 89%
- [ ] Avg Liveness: 96%
- [ ] Monthly data: 6 months (Nov-Apr)
- [ ] 4 frameworks in crosswalk

### Regulator Dashboard
- [ ] Total Users: 48,291
- [ ] Platforms: 23
- [ ] Compliance Rate: 91.7%
- [ ] Fraud Signals: 47
- [ ] 3 platforms in heatmap
- [ ] 3 fraud signals in feed
- [ ] 3 expiring alerts
- [ ] 4 framework scores

---

## 🐛 COMMON ISSUES TO CHECK

### Issue: Page Blank/White Screen
**Check:**
- [ ] Console for errors (F12)
- [ ] Network tab for failed requests
- [ ] Correct route in URL

### Issue: Mock Data Not Loading
**Check:**
- [ ] Files exist in `/data/mock/`
- [ ] Import statements correct
- [ ] No JavaScript errors

### Issue: Styles Not Applied
**Check:**
- [ ] CSS files imported
- [ ] Tailwind working
- [ ] Custom CSS loaded

### Issue: Fraud Signals Not Rotating
**Check:**
- [ ] useEffect hook running
- [ ] setInterval working
- [ ] State updating correctly

---

## ✅ FINAL ACCEPTANCE CRITERIA

### Demo is Ready If:
- [ ] All 6 routes load without errors
- [ ] Compliance Dashboard shows all widgets
- [ ] Regulator Dashboard shows all widgets
- [ ] Fraud signals auto-rotate every 5 seconds
- [ ] QA Harness tests all 7 error codes
- [ ] Zero PII visible anywhere
- [ ] Design matches Suirify branding
- [ ] Responsive on mobile/tablet/desktop
- [ ] No console errors
- [ ] Navigation works smoothly

---

## 🎬 DEMO REHEARSAL SCRIPT (2 Minutes)

### Run Through This Sequence:

**0:00 - Landing Page**
```
"This is Suirify - Nigeria's identity compliance infrastructure"
Show hero, scroll briefly
```

**0:15 - Verification Flow**
```
Click "Verify" link
"Users verify once with NIN and selfie"
Show verification steps
```

**0:30 - Compliance Dashboard**
```
Navigate to /dashboard/compliance
"Compliance officers see KYC posture in real-time"
Point to: KYC rate, Azure confidence, framework crosswalk
```

**0:50 - Regulator Dashboard**
```
Navigate to /dashboard/regulator
"NITDA sees entire ecosystem - 48,000 users, 23 platforms"
Point to: ecosystem stats, fraud signals
"Watch - signals update every 5 seconds"
Wait 5 seconds to show rotation
Point to: "Zero PII | NDPA Compliant" badges
```

**1:30 - QA Harness**
```
Navigate to /dashboard/qa
"All 7 error codes have UI states"
Click 2-3 error buttons to demonstrate
```

**1:50 - Wrap Up**
```
"One verification. Five frameworks. Zero PII."
```

**Total: 2:00 minutes**

---

## 📸 SCREENSHOTS TO TAKE

For documentation/presentation:
1. Landing page hero
2. Compliance Dashboard full view
3. Regulator Dashboard full view
4. Fraud signals (before and after rotation)
5. QA Harness with error displayed
6. Mobile view of any dashboard

---

## 🚀 READY TO TEST!

**Start Command:**
```bash
cd c:\Users\HP\Desktop\SUIRIFYPROTOCOL\suirify\frontend
npm run dev
```

**Then visit:**
- http://localhost:5173/ (Landing)
- http://localhost:5173/verify (Verification)
- http://localhost:5173/dashboard/compliance (Compliance)
- http://localhost:5173/dashboard/regulator (Regulator)
- http://localhost:5173/dashboard/extension (Extension)
- http://localhost:5173/dashboard/qa (QA Harness)

**Test Duration:** 30-45 minutes for complete testing

**Priority Tests:**
1. ✅ Compliance Dashboard (5 min)
2. ✅ Regulator Dashboard + Auto-rotate (10 min)
3. ✅ QA Harness - All 7 errors (10 min)
4. ✅ Design consistency (5 min)
5. ✅ Responsive testing (5 min)

---

**GOOD LUCK! 🎉**

*Everything is built and ready. Just run `npm run dev` and start testing!*
