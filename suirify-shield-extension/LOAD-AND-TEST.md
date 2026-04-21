# 🎯 LOAD & TEST - Step-by-Step Visual Guide

**Follow these exact steps to see your enhanced extension in action!**

---

## 📍 Step 1: Open Chrome Extensions Page

**Action:** Open a new Chrome tab and type in the address bar:

```
chrome://extensions/
```

**Press Enter**

**What you'll see:**
- A page titled "Extensions"
- List of your installed extensions
- A toggle for "Developer mode" in the top-right

---

## 📍 Step 2: Enable Developer Mode

**Action:** Look at the **top-right corner** of the page

**Find:** A toggle switch labeled "Developer mode"

**Click it** to turn it ON (it should turn blue)

**What happens:**
- Three new buttons appear: "Load unpacked", "Pack extension", "Update"
- You can now load local extensions

---

## 📍 Step 3: Click "Load Unpacked"

**Action:** Click the **"Load unpacked"** button (top-left area)

**What happens:**
- A file browser window opens
- You need to select the extension folder

---

## 📍 Step 4: Navigate to Extension Folder

**In the file browser, navigate to:**

```
c:\Users\HP\Desktop\SUIRIFYPROTOCOL\suirify\suirify-shield-extension
```

**Quick way:**
1. Copy the path above
2. Paste it in the address bar of the file browser
3. Press Enter

**What you should see in the folder:**
- manifest.json
- popup-v2.html
- popup-v2.css
- popup-v2.js
- background-v2.js
- content-v2.js
- And other files

---

## 📍 Step 5: Select the Folder

**Action:** Click the **"Select Folder"** button (bottom-right of file browser)

**What happens:**
- File browser closes
- Extension loads into Chrome
- You return to chrome://extensions/ page

**What you'll see:**
- A new card for "Suirify Shield"
- Version: 2.0.0
- Description: "AI-powered policy analysis with NDPA compliance. Powered by Microsoft Azure."
- Status: Enabled (toggle should be ON/blue)

---

## 📍 Step 6: Find Extension Icon

**Action:** Look at your Chrome toolbar (top-right, near the address bar)

**Find:** 
- A puzzle piece icon (Extensions menu)
- Click it to see all extensions

**Look for:** "Suirify Shield" in the list

**Action:** Click the **pin icon** next to "Suirify Shield" to pin it to toolbar

**What happens:**
- Suirify Shield icon appears directly in your toolbar
- You can now click it anytime

---

## 📍 Step 7: Check Traffic Light Badge

**Action:** Look at the Suirify Shield icon in your toolbar

**What you should see:**
- A small colored badge on the icon
- Color depends on current page:
  - 🟢 **Green with "✓"** = Safe site
  - 🟡 **Yellow with "!"** = Caution
  - 🔴 **Red with "⚠"** = Risky site

**If on chrome://extensions/ page:**
- Badge might be yellow (!) or not show (chrome:// pages are restricted)

---

## 📍 Step 8: Open Test Page

**Action:** Open the test page I created for you

**Two ways:**

**Option A: Double-click the file**
```
c:\Users\HP\Desktop\SUIRIFYPROTOCOL\suirify\suirify-shield-extension\test-page.html
```

**Option B: Drag and drop**
- Find the file in Windows Explorer
- Drag it into a Chrome tab

**What you'll see:**
- A nicely formatted test page
- Instructions for testing
- Mock policy links

---

## 📍 Step 9: Click Extension Icon

**Action:** Click the **Suirify Shield icon** in your toolbar

**What should happen:**
- A popup opens (420px wide)
- Dark background (#0a1419)
- Suirify branding visible

**What you should see in the popup:**

**Header:**
- "S" logo icon (mint green gradient)
- "Suirify Shield" title
- "Verify the internet back" tagline
- Traffic light indicator (colored dot)
- "Powered by Microsoft Azure" badge
- "NDPA Compliant" badge

**Controls:**
- Language selector dropdown (EN/Pidgin/Yoruba)
- Big mint green "Analyze This Site" button

**Footer:**
- "Powered by Microsoft Azure AI" text
- About and Privacy links

---

## 📍 Step 10: Click "Analyze This Site"

**Action:** Click the big mint green **"Analyze This Site"** button

**What should happen:**

**Phase 1: Loading (2 seconds)**
- Button shows loading spinner
- Text changes to "Analyzing..."
- Loading animation appears below
- Text: "Analyzing policy with Azure AI..."

**Phase 2: Results appear**
- Loading disappears
- Results section slides in

**What you should see:**

**Site Info:**
- Current URL displayed
- Analysis timestamp

**Risk Score Card:**
- Large number (0-100)
- Risk badge (SAFE/CAUTION/RISKY)
- Color-coded progress bar

**Summary:**
- Text explaining the risk

**Flagged Clauses:**
- List of 2-3 clauses
- Each with:
  - Title
  - Severity badge (High/Medium/Low)
  - Description
  - NDPA reference

**Suirify Gap:**
- Analysis of what's missing
- Comparison to Suirify standards

**Action Buttons:**
- "New Analysis" (secondary)
- "View Full Report" (primary)

---

## 📍 Step 11: Test Language Toggle

**Action:** In the popup, click the **Language dropdown**

**Select:** "Pidgin"

**Click:** "Analyze This Site" again

**What should happen:**
- Analysis runs again
- Text changes to Nigerian Pidgin English
- Example: "Dis policy no clear well-well..."

**Try:** Select "Yoruba"

**What should happen:**
- Text changes to Yoruba
- Example: "Ilana yi ko salaye kedere..."

**Try:** Select "English" to go back

---

## 📍 Step 12: Test on Real Websites

**Action:** Visit these websites and watch the badge change:

**Test 1: github.com**
```
https://github.com
```
**Expected:** Badge turns 🟢 Green with "✓"

**Test 2: google.com**
```
https://google.com
```
**Expected:** Badge turns 🟢 Green with "✓"

**Test 3: Any unknown site**
```
https://example.com
```
**Expected:** Badge turns 🟡 Yellow with "!"

**Test 4: Switch between tabs**
- Open multiple tabs with different sites
- Switch between them
- **Expected:** Badge updates for each tab

---

## 📍 Step 13: Check Console (Optional)

**Action:** With popup open, right-click anywhere and select **"Inspect"**

**What opens:**
- Chrome DevTools
- Console tab

**What to check:**
- No red error messages
- Maybe some blue info messages (normal)
- Extension should work without errors

**To close:** Click the X on DevTools

---

## ✅ SUCCESS CHECKLIST

**Your extension is working if:**

- [ ] Extension loads without errors
- [ ] Icon appears in Chrome toolbar
- [ ] Badge shows colored indicator
- [ ] Badge updates when switching tabs
- [ ] Popup opens when icon clicked
- [ ] Popup has dark Suirify design
- [ ] Analyze button works
- [ ] Loading animation shows
- [ ] Results display after 2 seconds
- [ ] Risk score shows (0-100)
- [ ] Flagged clauses appear
- [ ] Language selector works
- [ ] All 3 languages work (EN/Pidgin/Yoruba)
- [ ] No console errors

---

## 🐛 TROUBLESHOOTING

### Problem: Extension won't load

**Error:** "Manifest file is missing or unreadable"

**Solution:**
1. Check you selected the correct folder
2. Verify `manifest.json` exists in the folder
3. Try reloading: Click reload icon on extension card

---

### Problem: Popup is blank

**Solution:**
1. Right-click popup → Inspect
2. Check console for errors
3. Verify these files exist:
   - popup-v2.html
   - popup-v2.css
   - popup-v2.js

---

### Problem: Badge not showing

**Solution:**
1. Check extension is enabled (toggle ON)
2. Try visiting a regular website (not chrome://)
3. Reload extension: chrome://extensions/ → Click reload

---

### Problem: Wrong colors/design

**Solution:**
1. Check `popup-v2.css` file exists
2. Hard refresh popup: Ctrl+Shift+R
3. Reload extension

---

## 🎉 YOU'RE DONE!

**If everything works, you now have:**

✅ Enhanced Suirify Shield extension loaded  
✅ Traffic light indicator working  
✅ Suirify design system applied  
✅ Multi-language support active  
✅ Ready for Azure AI integration  

---

## 📸 WHAT TO DO NEXT

1. **Take Screenshots**
   - Popup with results
   - Traffic light badge
   - Different languages

2. **Test More Sites**
   - Try 10+ different websites
   - Note which show green/yellow/red

3. **Share with Team**
   - Show them the working extension
   - Get feedback on design
   - Discuss Azure AI integration

4. **Plan Next Steps**
   - Integrate Azure AI API
   - Create extension icons
   - Prepare for Chrome Web Store

---

## 📞 NEED HELP?

**Check these files:**
- `QUICK-START.md` - Quick reference
- `README-ENHANCED.md` - Full docs
- `INTEGRATION-GUIDE.md` - Troubleshooting

**Or:** Open an issue on GitHub

---

**ENJOY YOUR ENHANCED EXTENSION! 🚀**

*Last Updated: 2026-04-21*  
*Version: 2.0.0*  
*Status: ✅ Ready to Test*
