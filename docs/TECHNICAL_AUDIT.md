# HireSense AI — Comprehensive Technical Audit

**Date:** October 2026  
**Auditor:** Senior Full-Stack, AI & Security Engineering Team  
**Scope:** Frontend (React 19, Vite, Tailwind CSS v4), Backend (Node.js, Express 5, Mongoose 9, MongoDB), AI Engine (Google Gemini 2.0 Flash), Security & Infrastructure.

---

## Executive Summary

HireSense AI (formerly CVAnalyzer) has a working foundation using modern technologies (React 19, Express 5, Mongoose 9, Google Gemini 2.0 Flash). However, critical vulnerabilities and architectural deficiencies were identified during the audit:
1. **Critical Security Vulnerabilities**: Hardcoded administrator credentials auto-seeded in server code; public registration endpoint permitting unauthorized creation of `admin` roles; unrestricted static public serving of sensitive candidate resumes via `/uploads`; unauthorized access to candidate resumes and applications across tenant boundaries (`getCandidateResume`, `getApplicationById`, `updateRanking`).
2. **AI & Pipeline Deficiencies**: Direct string interpolation of untrusted resume data into Gemini prompts without injection protection; absence of structured JSON mode (`responseMimeType: "application/json"`) and output numeric range validation; missing bulk resume upload support; missing deduplication/caching leading to redundant paid AI requests.
3. **Database & Backend Performance Bottlenecks**: Missing essential MongoDB indexes on `Job.employerId`, `Job.status`, `Resume.userId`, `Application.candidateId`, `Application.jobId`; N+1 query patterns in dashboard controllers; absence of `.lean()` and targeted field projections (`.select('-rawText')`) causing high memory and network overhead.
4. **Frontend Architecture & UX Issues**: Monolithic 809 kB JavaScript bundle with zero route-level code splitting; 49 ESLint warnings/errors; legacy "CVAnalyzer" branding across navigation, auth, and titles; missing candidate navigation links for job search and applications; lack of proper error boundaries and empty state handling.

---

## 1. Security Audit Findings

| ID | Finding | Severity | Evidence (Files & Lines) | Recommended Fix | Status | Verification Method |
|---|---|---|---|---|---|---|
| **SEC-01** | **Hardcoded Admin Credentials in DB Connection Hook** | **Critical** | `backend/server.js#L28-L50` | Remove hardcoded admin creation script from server startup. Use secure environment variable configuration or CLI migration script without printing credentials to logs. | Planned | Inspect `server.js`, verify no credentials printed on startup. |
| **SEC-02** | **Privilege Escalation via Public Registration** | **Critical** | `backend/controllers/authController.js#L20-L21`, `frontend/src/pages/Register.jsx#L148-L161` | Restrict public registration to `candidate` and `employer` roles only. Reject `admin` role in public API. Remove admin option from registration form. | Planned | Integration test attempting `POST /api/auth/register` with `role: "admin"` returns 400 or defaults to candidate. |
| **SEC-03** | **Unauthenticated Public Static Serving of Resumes** | **Critical** | `backend/server.js#L128` (`app.use('/uploads', express.static(...))`) | Remove public static route for `/uploads`. Require authenticated and authorized stream/download endpoints verifying candidate ownership or associated employer permissions. | Planned | Direct HTTP GET to `/uploads/<file>.pdf` without token must return 401/404. |
| **SEC-04** | **Broken Object Level Authorization (BOLA) in Candidate Resume & Application Endpoints** | **Critical** | `backend/controllers/resumeController.js#L195-L207` (`getCandidateResume`), `backend/controllers/applicationController.js#L173-L197` (`getApplicationById`), `backend/controllers/analysisController.js#L103-L122` (`updateRanking`) | Enforce strict authorization checks: verify employer owns the specific job or candidate owns the resume/application. For status updates, verify employer ownership of the parent job. | Planned | Multi-tenant auth tests: Candidate A attempting to read Candidate B's application receives 403 Forbidden. |
| **SEC-05** | **Magic Byte Validation Bypass in Multi-file Uploads** | **High** | `backend/middleware/uploadMiddleware.js#L75-L108` | `validateFileIntegrity` only checks `req.file`. When multiple files are processed via `req.files`, validation is skipped. Extend validation to iterate through `req.files`. | Planned | Upload test with invalid binary payload renamed to `.pdf` via bulk upload is rejected with 400. |
| **SEC-06** | **Missing Formula Injection Protection on Potential CSV Exports** | **Medium** | Missing CSV export implementation | When exporting candidate data to CSV, sanitize cells starting with `=`, `+`, `-`, or `@` by prefixing with a single quote `'` to prevent CSV/spreadsheet formula injection. | Planned | Export test verifying `=cmd\|' /C calc'!A0` is sanitized to `'=cmd\|' /C calc'!A0`. |
| **SEC-07** | **Sensitive Information & Stack Trace Leakage in API Responses** | **Medium** | `backend/controllers/authController.js#L42`, `backend/controllers/jobController.js#L32`, `backend/controllers/applicationController.js#L115` | Never expose raw `error.message` or internal server details in production responses. Return sanitized user-facing messages. | Planned | Simulate database failure; verify client response contains generic message without DB connection strings or traces. |
| **SEC-08** | **Unrestricted Allowed Origins in CORS Config** | **Low** | `backend/server.js#L67-L85` | Allowed origins list is hardcoded with static Render URL. Allow configuration via `process.env.CLIENT_URL` with strict fallback. | Planned | Test CORS headers against configured `CLIENT_URL`. |

---

## 2. AI Engine & Ranking Audit Findings

| ID | Finding | Severity | Evidence (Files & Lines) | Recommended Fix | Status | Verification Method |
|---|---|---|---|---|---|---|
| **AI-01** | **Direct Untrusted Resume String Interpolation (Prompt Injection Risk)** | **High** | `backend/services/aiService.js#L108-L112` | Wrap resume data in distinct untrusted XML delimiters `<untrusted_candidate_resume>` and instruct Gemini explicitly to treat resume content strictly as data, never instructions. | Planned | Automated test passing prompt-injection resume string; verify AI treats it as skill text and does not alter JSON instructions. |
| **AI-02** | **Lack of Structured Output Schema & Numeric Range Validation** | **High** | `backend/services/aiService.js#L171-L200` | Configure Gemini `generationConfig` with `responseMimeType: "application/json"`. Implement strict schema validation verifying all 11 dimension scores are integers bounded between 0 and 100. | Planned | Schema validation unit tests rejecting missing dimensions, NaN, negative, or >100 scores. |
| **AI-03** | **Unbounded Sequential Processing of All System Candidates** | **High** | `backend/services/rankingService.js#L74-L111` | `analyzeAndRankCandidates` queries all candidates in the system sequentially with unthrottled external Gemini API calls. Scope to applicants for the job or bulk-uploaded files with controlled concurrency (`p-limit` or batching) and caching. | Planned | Test job analysis with batch limit; verify execution completes without timeout. |
| **AI-04** | **Missing Secondary Tie-Breaking in Deterministic Candidate Ranking** | **Medium** | `backend/services/rankingService.js#L252-L260`, `backend/utils/rankingEngine.js#L198` | Identical overall scores result in non-deterministic ranking. Add explicit deterministic tie-breaking (e.g. secondary score comparison on `skillMatch`, `experienceMatch`, then document timestamp). | Planned | Unit test with tied scores verifies deterministic order across repeated runs. |
| **AI-05** | **Absence of Analysis Result Caching / Fingerprinting** | **Medium** | `backend/services/aiService.js#L78-L239` | Repeated analyses of identical resume content against unchanged job requirements consume redundant API quota and time. Implement a content-hash fingerprint cache for identical inputs. | Planned | Test running analysis twice on identical inputs; second run resolves from cache instantaneously. |
| **AI-06** | **Permanent Error Retries Causing Latency Spikes** | **Medium** | `backend/services/aiService.js#L18-L34` | Retries occur unconditionally for all error codes, including 400 Bad Request and 401 Unauthorized. Filter retries to transient 429 and 503 errors with exponential backoff. | Planned | Unit test with 401 error verifies zero retries. |

---

## 3. Backend & Database Performance Audit Findings

| ID | Finding | Severity | Evidence (Files & Lines) | Recommended Fix | Status | Verification Method |
|---|---|---|---|---|---|---|
| **DB-01** | **Missing MongoDB Query Indexes** | **High** | `backend/models/Job.js`, `backend/models/Resume.js`, `backend/models/Application.js` | Add compound indexes: `Job({ employerId: 1, createdAt: -1 })`, `Job({ status: 1, createdAt: -1 })`, `Resume({ userId: 1, createdAt: -1 })`, `Application({ candidateId: 1, createdAt: -1 })`, `Application({ jobId: 1, status: 1 })`. | Planned | Run Mongoose index creation and verify with `.explain('executionStats')`. |
| **DB-02** | **N+1 Database Query in Employer Dashboard** | **High** | `backend/controllers/dashboardController.js#L26-L35` | Iterates over jobs array and executes separate `Application.countDocuments` for each job. Replace with a single MongoDB `$group` aggregation pipeline. | Planned | Benchmark employer dashboard query count; verify single aggregation query. |
| **DB-03** | **Unprojected `rawText` Over-Fetching in Resume Queries** | **Medium** | `backend/controllers/resumeController.js#L134-L143`, `backend/models/Resume.js#L75` | Querying resumes retrieves full raw text strings (up to several hundred kilobytes per resume). Add `.select('-rawText')` to all list and dashboard queries. | Planned | Measure API payload size before and after projection; verify `rawText` omitted. |
| **DB-04** | **Unbounded Result Sets in Employer Job List** | **Medium** | `backend/controllers/jobController.js#L92-L101` | `getEmployerJobs` returns all jobs with full descriptions without pagination or projection. Add pagination (`page`, `limit`) and lightweight projection. | Planned | Verify pagination metadata (`page`, `total`, `pages`) returned in endpoint response. |
| **DB-05** | **Destructive In-Place Re-analysis Wiping Candidate Status** | **Medium** | `backend/services/rankingService.js#L273` (`await Ranking.deleteMany({ job: jobId })`) | Calling re-analysis deletes all existing rankings, permanently losing recruiter shortlists and rejections. Use atomic upsert (`bulkWrite` or `$set`) preserving candidate decision status. | Planned | Verify shortlisted status remains intact after re-running analysis. |

---

## 4. Frontend Performance, UX & Code Quality Audit Findings

| ID | Finding | Severity | Evidence (Files & Lines) | Recommended Fix | Status | Verification Method |
|---|---|---|---|---|---|---|
| **UI-01** | **Monolithic 809 kB JavaScript Bundle with Zero Code Splitting** | **High** | `frontend/src/routes/AppRoutes.jsx#L5-L26`, `frontend/vite.config.js` | All 14 page components and heavy libraries (Recharts) are synchronously imported. Implement `React.lazy()` route splitting with `Suspense` and accessible loading skeleton. | Planned | Measure Vite build output; verify main bundle size drops below 250 kB with separate async chunks. |
| **UI-02** | **49 ESLint Violations & Hook Access-Before-Declaration Errors** | **High** | `frontend/eslint.config.js`, all page components | Functions called inside `useEffect` are declared as arrow functions after the effect, triggering ESLint errors. Clean up unused imports and declare functions prior to effect references. | Planned | Run `npm run lint` in frontend; verify 0 errors. |
| **UI-03** | **Inconsistent Legacy Branding ("CVAnalyzer") Across Application** | **Medium** | `frontend/src/components/Navbar.jsx#L54`, `frontend/src/pages/Login.jsx#L80`, `frontend/src/pages/Register.jsx#L94`, `frontend/index.html#L7` | Update all branding to **HireSense AI**, tagline to "Smarter Screening. Better Hiring.", and update page titles and SVG favicon. | Planned | Full repository string search verifies zero occurrences of "CVAnalyzer". |
| **UI-04** | **Missing Candidate Navigation Links in Main Navbar** | **Medium** | `frontend/src/components/Navbar.jsx#L16-L19` | Candidate navbar only shows "Dashboard" and "My Resume". "Browse Jobs" and "My Applications" are missing. Add all candidate routes to navigation. | Planned | Verify all candidate links appear and navigate correctly. |
| **UI-05** | **Missing Error States and Graceful Degradation in Dashboards** | **Medium** | `frontend/src/pages/CandidateDashboard.jsx#L20`, `frontend/src/pages/EmployerDashboard.jsx#L42` | Failed API requests silently set empty data with no user feedback. Add explicit error alerts, empty states, and retry buttons. | Planned | Simulate network failure; verify user-friendly error UI with retry action. |
| **UI-06** | **Misaligned Upload Size Limits Between Frontend and Backend** | **Low** | `frontend/src/pages/ResumeUpload.jsx#L73` (10MB) vs `backend/middleware/uploadMiddleware.js#L114` (5MB) | Align frontend validation message and check to 5MB to match backend Multer limit. | Planned | Attempt uploading a 6MB file; frontend immediately provides informative error. |

---

## 5. Audit Remediation Roadmap

The implementation will proceed according to the phased engineering strategy:
- **Phase 1 (Stage B - Security & Correctness)**: SEC-01 through SEC-05, AI-01, AI-02, AI-04, DB-05.
- **Phase 2 (Stage C - Backend & DB Performance)**: DB-01 through DB-04, AI-03, AI-05, AI-06, SEC-06 (CSV export).
- **Phase 3 (Stage D - Frontend Performance, UX & Branding)**: UI-01 through UI-06, HireSense AI branding overhaul, bulk resume upload feature.
- **Phase 4 (Stage E - Testing & Verification)**: Automated tests (auth, ranking, security, uploads, AI parsing), production build verification, lint verification.
- **Phase 5 (Stage F - Documentation & Developer Experience)**: README.md, .env.example, final engineering report.
