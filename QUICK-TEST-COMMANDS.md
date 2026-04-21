# ⚡ QUICK TEST COMMANDS - Suirify Complete Testing

**Everything you need to test in one place**

---

## 🎯 WHAT TO TEST

### 1. Frontend Dashboards (Built in Phase 7 & 8)
### 2. Chrome Extension (Enhanced with ClauseLens)

---

## 🚀 FRONTEND TESTING

### Start Frontend Server

```bash
cd c:\Users\HP\Desktop\SUIRIFYPROTOCOL\suirify\frontend
npm run dev
```

**Opens at:** `http://localhost:5173/`

### Routes to Test (Copy-Paste These)

```
http://localhost:5173/
http://localhost:5173/verify
http://localhost:5173/dashboard/compliance
http://localhost:5173/dashboard/regulator
http://localhost:5173/dashboard/extension
http://localhost:5173/dashboard/qa
```

### Quick Test Sequence (10 Minutes)

**1. Compliance Dashboard** (3 min)
```
URL: http://localhost:5173/dashboard/compliance

Check:
✓ KYC Rate card
✓ Azure confidence bars
✓ Monthly volume chart
✓ Framework crosswalk table
✓ Recent failures log
✓ Export Audit Pack button
```

**2. Regulator Dashboard** (5 min)
```
URL: http://localhost:5173/dashboard/regulator

Check:
✓ Ecosystem stats (48,291 users)
✓ Platform compliance heatmap
✓ Live fraud signals feed
✓ WAIT 5 SECONDS - Signals should rotate!
✓ "Zero PII | NDPA Compliant" badge (TOP)
✓ "Zero PII | NDPA Compliant" badge (BOTTOM)
```

**3. QA Harness** (2 min)
```
URL: http://localhost:5173/dashboard/qa

Check:
✓ Click each error button
✓ Verify error displays
✓ Check retry button logic
```

---

## 🛡️ EXTENSION TESTING

### Load Extension in Chrome

```
1. Open: chrome://extensions/
2. Enable "Developer mode" (toggle top-right)
3. Click "Load unpacked"
4. Select: c:\Users\HP\Desktop\SUIRIFYPROTOCOL\suirify\suirify-shield-extension
5. Click "Select Folder"
```

### Quick Test Sequence (5 Minutes)

**1. Traffic Light** (1 min)
```
Visit: https://github.com
Expected: Badge turns GREEN ✓

Visit: https://example.com
Expected: Badge turns YELLOW !
```

**2. Popup** (2 min)
```
Click extension icon
Expected:
✓ Dark Suirify design
✓ Mint green button
✓ Azure badges
✓ Language selector
```

**3. Analysis** (2 min)
```
Click "Analyze This Site"
Expected:
✓ Loading animation
✓ Results after 2 seconds
✓ Risk score displays
✓ Flagged clauses show
```

---

## 📋 COMPLETE TEST CHECKLIST

### Frontend (30 min)
- [ ] Landing page loads
- [ ] Compliance Dashboard - all widgets
- [ ] Regulator Dashboard - all widgets
- [ ] Fraud signals auto-rotate (5s)
- [ ] QA Harness - all 7 errors
- [ ] Zero PII everywhere
- [ ] Design consistent
- [ ] Responsive (resize browser)

### Extension (15 min)
- [ ] Extension loads
- [ ] Badge shows (colored)
- [ ] Badge updates per tab
- [ ] Popup opens
- [ ] Suirify design applied
- [ ] Analyze works
- [ ] Results display
- [ ] Language toggle works

---

## 🎬 DEMO REHEARSAL (2 Minutes)

### Full Demo Flow

```
1. Landing Page (10s)
   → Show hero
   → "One verification, five frameworks, zero PII"

2. Compliance Dashboard (20s)
   → Show KYC posture
   → Point to Azure confidence
   → "Audit pack ready for CBN"

3. Regulator Dashboard (30s)
   → Show ecosystem stats
   → Point to fraud signals
   → WAIT 5s to show rotation
   → Point to "Zero PII" badges

4. Extension (30s)
   → Click icon
   → Show popup design
   → Click analyze
   → Show results
   → Toggle language

5. Wrap Up (10s)
   → "Verify once. Use everywhere. Zero PII."
```

**Total: 2:00 minutes**

---

## 🐛 TROUBLESHOOTING

### Frontend Won't Start

```bash
# Try this:
cd c:\Users\HP\Desktop\SUIRIFYPROTOCOL\suirify\frontend
npm install
npm run dev
```

### Extension Won't Load

```
1. Check manifest.json exists
2. Verify folder path is correct
3. Try reloading: chrome://extensions/ → Click reload
```

### Page Blank/White

```
1. Press F12 (open console)
2. Check for red errors
3. Verify route is correct
```

### Fraud Signals Not Rotating

```
1. Wait full 5 seconds
2. Check console for errors
3. Verify you're on /dashboard/regulator
```

---

## 📊 SUCCESS CRITERIA

### ✅ Frontend Ready If:
- All 6 routes load
- Dashboards show data
- Fraud signals rotate
- Zero PII visible
- Design consistent

### ✅ Extension Ready If:
- Loads without errors
- Badge shows colors
- Popup has Suirify design
- Analysis works
- Languages work

---

## 📚 DOCUMENTATION

**Frontend:**
- `FRONTEND-TEST-PLAN.md` - Complete test plan
- `TEST_EXECUTION_REPORT.md` - Automated test results
- `PHASE6_MANUAL_TESTING_GUIDE.md` - Manual testing

**Extension:**
- `LOAD-AND-TEST.md` - Step-by-step guide
- `README-ENHANCED.md` - Full documentation
- `QUICK-START.md` - 5-minute start

---

## 🎯 PRIORITY ORDER

**Test in this order:**

1. **Frontend - Regulator Dashboard** (CRITICAL)
   - Must show fraud signal rotation
   - Must have Zero PII badges

2. **Frontend - Compliance Dashboard**
   - Must show all widgets
   - Must have Azure confidence

3. **Frontend - QA Harness**
   - Must test all 7 errors

4. **Extension - Traffic Light**
   - Must show colored badge

5. **Extension - Popup**
   - Must have Suirify design

---

## ⏱️ TIME ESTIMATES

**Quick Test (15 min):**
- Frontend: 10 min (just dashboards)
- Extension: 5 min (just traffic light + popup)

**Full Test (45 min):**
- Frontend: 30 min (all routes + responsive)
- Extension: 15 min (all features + languages)

**Demo Rehearsal (2 min):**
- Run through demo script twice

---

## 🚀 START TESTING NOW!

**Step 1: Frontend**
```bash
cd c:\Users\HP\Desktop\SUIRIFYPROTOCOL\suirify\frontend
npm run dev
```

**Step 2: Open Browser**
```
http://localhost:5173/dashboard/regulator
```

**Step 3: Watch Fraud Signals**
```
Wait 5 seconds → Should see rotation
```

**Step 4: Load Extension**
```
chrome://extensions/ → Load unpacked
```

**Step 5: Test Extension**
```
Click icon → Analyze → See results
```

---

**EVERYTHING IS READY! START TESTING! 🎉**

*Last Updated: 2026-04-21*  
*Status: ✅ Ready for Testing*
