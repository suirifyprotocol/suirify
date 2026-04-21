# Suirify Shield Extension (MVP)

Manifest V3 extension for policy-risk analysis demo.

## Features

- Detects policy-like links on current page via content script.
- Popup analysis with language toggle: `EN`, `Pidgin`, `Yoruba`.
- Shows risk score, flagged clauses, NDPA references, and Suirify gap note.
- Includes `Powered by Microsoft Azure` badge.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select `suirify-shield-extension/`.
5. Visit any website and open the extension popup.

## Notes

- Current analysis uses local mock data for hackathon reliability.
- Content script link detection is active on regular web pages (`http/https`).
- Restricted pages (like `chrome://`) do not allow content script messaging.
