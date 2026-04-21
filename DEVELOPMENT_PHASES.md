# Suirify Development Phases (Sprint to 11:00am)

Date: 2026-04-21
Start Time: 05:01
Hard Deadline: 11:00
Total Window: ~6 hours

## Mission

Ship a stable end-to-end demo flow for the hackathon pitch:

1. Verify user (mock-first, zero PII in UI)
2. Show AI verification progress and result states
3. Show Compliance Dashboard (platform view)
4. Show Regulator Dashboard (ecosystem view)
5. Show Chrome Extension risk analysis flow

## Non-Negotiables

- Mock-data-first for frontend and extension UI.
- Zero PII displayed or persisted in frontend views.
- Every AI decision shows confidence score + deterministic rules result.
- All error codes have visible UI states:
  `NIN_NOT_FOUND`, `FACE_MATCH_FAILED`, `LIVENESS_FAILED`, `AGE_BELOW_18`, `MAX_RETRIES_EXCEEDED`, `NIN_ALREADY_ATTESTED`, `CONSENT_DENIED`.
- Accessibility: every interactive element has `aria-label`.

## Team Tracks

- Frontend + AI Engineer: verification UI, dashboards, extension popup, docs glue.
- Backend Engineer: verify endpoints, dashboard APIs, extension analysis API, mock contracts.
- Smart Contract Engineer: attestation validity/revocation/expiry checks and query compatibility.

## Phase Plan (05:01 -> 11:00)

### Phase 1: Setup and Lock Scope (05:01 - 05:30)

Goal: freeze scope and remove ambiguity.

Tasks:

- Confirm demo app target for hackathon flow (`frontend/` and/or `DemoApp/`).
- Freeze mock data contracts for:
  - verification progress/results
  - compliance dashboard
  - regulator dashboard
  - extension analysis response
- Define one source of truth for shared TypeScript types.

Deliverables:

- `frontend/src/types/verification.ts`
- `frontend/src/types/dashboard.ts`
- `frontend/src/types/extension.ts`
- `frontend/src/data/mock/*.ts` (all mock payloads)

Definition of done:

- All FE pages/components compile against typed mock models.
- No `any` in newly added files.

### Phase 2: Verification UX Core (05:30 - 07:00)

Goal: complete verification wow flow (Step 5 and Step 6).

Tasks:

- Build `VerificationProgress.tsx`:
  - Ordered stages: NIN Check -> Face Match -> Liveness -> PII Purge -> Rules Engine
  - Animated transitions (pending -> pass/fail)
  - Show Azure confidence values where applicable
  - Show reason code on failure
- Build `VerificationResult.tsx`:
  - Success state: attestation ID, claims checklist, frameworks satisfied, expiry
  - Fail state: error code, guidance text, retry action
- Ensure consent state is respected before progression.

Suggested file targets:

- `frontend/src/modules/verification/components/VerificationProgress.tsx`
- `frontend/src/modules/verification/components/VerificationResult.tsx`
- `frontend/src/modules/verification/constants/errorCodes.ts`

Definition of done:

- Simulated success path fully renders.
- At least 3 failure simulations validated locally.
- Zero PII shown in progress or result UI.

### Phase 3: Dashboards (07:00 - 08:45)

Goal: make both dashboards demo-ready with live-feeling mock data.

Tasks (Compliance Dashboard):

- KPI cards: KYC rate, active/expired attestations, failed verifications.
- AI confidence monitoring widget.
- Monthly verification volume chart.
- Framework crosswalk table.
- Recent failures log with error codes + confidence.
- Audit Pack Export button (mock action).

Tasks (Regulator Dashboard):

- Ecosystem stats cards.
- Platform compliance heatmap/table.
- Live fraud signals feed (auto-refresh every 5s, mock timer).
- Expiring attestations alert panel.
- Framework compliance summary.
- Persistent `Zero PII | NDPA Compliant` badges in header/footer.

Suggested file targets:

- `frontend/src/pages/dashboard/compliance.tsx`
- `frontend/src/pages/dashboard/regulator.tsx`
- `frontend/src/components/dashboard/*`

Definition of done:

- Both routes load cleanly and are responsive on desktop/mobile.
- Regulator dashboard contains no wallet-level identifiers.

### Phase 4: Chrome Extension MVP (08:45 - 09:40)

Goal: demoable extension that tells the story end-to-end.

Tasks:

- Manifest V3 wiring complete.
- Popup UI with:
  - risk score (0-100)
  - flagged clauses
  - NDPA references
  - language toggle (`EN | Pidgin | Yoruba`)
  - "Powered by Microsoft Azure" badge
  - "Suirify gap" recommendation section
- Mock analyzer response integration (or backend stub if ready).

Definition of done:

- Popup opens and renders mock analysis consistently.
- At least one real website URL test via content script path.

### Phase 5: Integration and API Handshake (09:40 - 10:20)

Goal: connect FE to backend stubs without breaking demo reliability.

Tasks:

- Wire FE service layer to backend endpoints with feature flag fallback to mock:
  - `POST /api/verify/start`
  - `POST /api/verify/submit`
  - `GET /api/dashboard/compliance`
  - `GET /api/dashboard/regulator`
  - `POST /api/extension/analyze`
- Add resilient fallback handling when API unavailable.
- Verify smart contract compatibility assumptions for attestation shape.

Definition of done:

- Demo works even if backend is down (mock fallback).
- Error boundaries and user-safe messaging are in place.

### Phase 6: QA, Pitch Script, and Freeze (10:20 - 11:00)

Goal: final polish and no-surprises demo state.

Tasks:

- Run full golden path walkthrough under 2 minutes.
- Validate all required error UI states.
- Accessibility quick pass (buttons, toggles, retry actions).
- Visual consistency pass (badges, labels, confidence fields).
- Smoke test in browser + extension side by side.

Definition of done:

- Demo script can be run twice in a row without failure.
- Team signs off on "pitch-ready" build.

## Immediate Execution Order (Start Now)

1. Create shared types + mock contracts.
2. Build `VerificationProgress.tsx`.
3. Build `VerificationResult.tsx`.
4. Finish Compliance Dashboard.
5. Finish Regulator Dashboard.
6. Finish Extension popup MVP.
7. Wire API layer with fallback.
8. Rehearse and freeze.

## Fast Standup Format (Every 30 Minutes)

Use this exact format:

- Done:
- Next:
- Blocker:
- Needs from teammate:

## Blocker Protocol

- If blocked > 10 minutes, switch to fallback implementation and continue.
- Never block frontend progress on backend readiness; use typed mocks.
- Never block demo on chain calls; use cached mock attestation for UI path.

## Final Demo Acceptance Checklist

- Verification flow shows AI pipeline with confidence + rules decision.
- Success + failure result states are both polished.
- Compliance dashboard answers "Are we compliant right now?"
- Regulator dashboard answers "What is ecosystem posture now?"
- Extension demonstrates policy risk analysis story.
- Zero PII claim is visibly and consistently enforced.

---

Owner: Frontend + AI Engineer
Status: Active
