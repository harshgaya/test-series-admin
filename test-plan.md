# RB Academy - Full System Test Plan

**Goal:** Make the test series system stable end to end: Admin web, API, Student web, Flutter mobile.

The system has four layers. A bug in the API breaks both clients, so test the API hardest. Order of testing matters: fix data and API first, then clients, because clients only reflect what the API returns.

---

## Layer 0: Data integrity (foundation)

If data is wrong, everything above looks broken. You already built the chapters health banner - extend that habit.

| Check                                     | How                                                                                                                                               | Pass condition |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| No question subject/chapter mismatch      | `SELECT q.subject_id, c.subject_id, COUNT(*) FROM questions q JOIN chapters c ON c.id=q.chapter_id WHERE q.subject_id<>c.subject_id GROUP BY 1,2` | 0 rows         |
| No question exam/chapter mismatch         | join through subject, compare exam_id                                                                                                             | 0 rows         |
| No duplicate chapters                     | chapters health banner                                                                                                                            | green          |
| No duplicate subjects per exam            | banner                                                                                                                                            | green          |
| Every MCQ has exactly one+ correct option | `SELECT question_id FROM question_options GROUP BY question_id HAVING SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)=0` for MCQ                      | 0 rows         |
| Every active question has 4 options (MCQ) | group + count                                                                                                                                     | all = 4        |
| INTEGER questions have integer_answer     | `WHERE question_type='INTEGER' AND integer_answer IS NULL`                                                                                        | 0 rows         |

Run these as a saved SQL file monthly, or build an `/admin/health` page that runs them and shows red/green (same pattern as the chapters banner).

---

## Layer 1: API (test this hardest - both clients depend on it)

Test each endpoint directly with curl/Postman BEFORE testing through a UI. This isolates whether a bug is API or client.

### Auth

- Student signup, login - returns token
- Login with wrong password - 401
- OTP request + verify - returns token in BODY (Flutter needs this, not just cookie)
- Protected route with Bearer token in header - works
- Protected route with no token - 401
- Protected route with expired/garbage token - 401

### Questions / classification (the bug area)

- POST question with only chapterId - subject+exam auto-derived correctly
- POST with WRONG subjectId but right chapterId - ignores client, derives from chapter
- Bulk import 5 rows - all land in correct exam/subject (you tested this, keep as regression)
- Duplicate question text in same exam - flagged as duplicate

### Test building (difficulty split area)

- Auto-build request N where chapter has >= N - returns exactly N (shortfall fill works)
- Auto-build request N where chapter has < N total - returns all available, no crash
- Auto-build with skewed difficulty (request balanced from a HARD-only chapter) - fills from other difficulties
- Build with excludeIds - excluded questions never appear
- Manual pick - selected questions saved in order

### Attempt / scoring (money + trust area)

- Start attempt - creates attempt, returns questions WITHOUT correct answers exposed
- Submit answers - score computed correctly (test +4 correct, -1 wrong, 0 skipped)
- INTEGER answer scoring - exact match
- MULTI_CORRECT scoring - partial vs full per your rule
- Re-submit / double submit - blocked or idempotent
- Rank + percentile calculated after submit

### Payments

- Create Razorpay order - returns order id
- Verify payment signature - valid passes, tampered fails
- Purchase unlocks test - student can now start it
- Free test - no payment required

---

## Layer 2: Admin web

- Create exam > subject > chapter > topic chain
- Add question (manual) with LaTeX - renders in preview
- OCR upload - extracts, saves to right chapter
- Bulk Excel import - success/duplicate/error counts correct
- Create test via auto-build - count matches request
- Publish test - appears for students
- Chapters health banner - green after cleanup
- Duplicate chapter name - blocked (your new guard)

---

## Layer 3: Student web

- Browse exams > see published tests
- Locked test prompts payment; free test opens
- Take test: timer counts down, navigation works, mark for review, LaTeX renders
- Auto-submit on timer expiry
- Submit - see score, rank, solutions (LaTeX renders)
- Attempt history shows past attempts

---

## Layer 4: Flutter mobile (the integration risk)

Mobile breaks differently from web. Key risks: auth header, HTTP on device, Decimal-as-String parsing, LaTeX.

- Login persists token (GetStorage) and sends Bearer header on protected calls
- apiBaseUrl points to reachable host (LAN IP for device, not localhost)
- iOS HTTP allowed (NSAppTransportSecurity) if not HTTPS
- Exam/subject/chapter lists load
- Decimal fields (score, price, negativeMarking) parse without "String is not subtype of double" crash
- LaTeX renders in question, options, solution (flutter_math_fork)
- Question image shows only when URL present
- Take full attempt - submit - score matches what web shows for same answers
- Attempt history loads
- Razorpay flow (when built)
- Airplane mode mid-test - graceful error, no crash

---

## Critical cross-checks (web vs mobile must agree)

The same attempt scored on web and mobile MUST produce the same number. Test this explicitly:

1. Same student, same test, same answers
2. Submit on web - note score/rank
3. Submit on mobile (different attempt) - score must match for identical answers
   If they differ, scoring logic is duplicated somewhere instead of living only in the API. Scoring must live ONLY in the API.

---

## Stability practices (ongoing)

1. **Seed test data** - a script that creates one exam with known questions, so you can test repeatably.
2. **Regression list** - every bug you fix (classification, shortfall, duplicates) becomes a permanent test case. Re-run before each deploy.
3. **One source of truth** - scoring, classification, pricing live in the API only. Clients display, never compute.
4. **Health page** - turn the Layer 0 SQL into an `/admin/health` dashboard.
5. **Smoke test before deploy** - login, load a test, submit, see score. 5 minutes, catches most breakage.

---

## Suggested order to reach "stable"

1. Run all Layer 0 SQL - fix data (you are mostly here)
2. Test API auth + classification + scoring with curl - fix
3. Admin web smoke test
4. Student web full attempt flow
5. Flutter: auth header + one full attempt + scoring cross-check vs web
6. Build the regression list from everything above
7. Add /admin/health page so data never silently drifts again
