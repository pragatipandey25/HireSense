<div align="center">

# 🚀 HireSense AI
### Smarter Screening. Better Hiring.

**AI-Powered Resume Screening, Candidate Ranking & Recruitment Intelligence Platform**

![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?logo=tailwindcss&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose_9-880000?logo=mongoose&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_2.0_Flash-4285F4?logo=googlegemini&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-19%20Passing-success)

</div>

---

## 📖 Overview

**HireSense AI** is a production-quality, full-stack recruitment intelligence platform that modernizes candidate screening with explainable AI evaluation, multi-dimensional semantic matching, skill gap discovery, and recruitment analytics.

Rather than relying on brittle keyword searches or manual review of hundreds of resumes, recruiters and hiring managers use HireSense AI to objectively analyze candidate credentials against specific role requirements with human-in-the-loop decision-making.

### Key Value Propositions
- **Reduced Manual Review Workload**: Parse and screen candidate pools within seconds.
- **Explainable Multi-Dimensional Scoring**: Transparent, auditable evaluation across 11 discrete competencies rather than opaque black-box numbers.
- **Automated Skill-Gap Discovery**: Immediate identification of required competencies missing from a candidate's profile.
- **Recruitment Analytics**: Rich visual pipeline metrics with Recharts tracking candidate status distribution and conversion rates.
- **Candidate Transparency**: Gives job applicants real-time status visibility and diagnostic AI feedback to improve their resumes.

---

## ✨ Features

### 🏢 For Recruiters & Employers
- **Job Vacancy Lifecycle**: Create, update, close, and reopen job postings with full criteria specification (skills, experience thresholds, education levels, and responsibilities).
- **Multi-File Bulk Resume Upload**: Upload up to 10 resumes simultaneously with bounded concurrency and magic byte file integrity verification (`%PDF` and `PK\x03\x04`).
- **AI-Assisted Candidate Ranking**: One-click multi-dimensional evaluation powered by Google Gemini 2.0 Flash in structured JSON mode.
- **Deterministic 11-Dimension Scoring Engine**:
  - Overall Weighted Score
  - Resume Content Relevance (30%)
  - Technical Skill Alignment (25%)
  - Experience Depth (12%)
  - Educational Background (8%)
  - Certifications (5%)
  - Project Quality (5%)
  - Leadership Potential (3%)
  - ATS Parsability (3%)
  - Communication Skills (2%)
  - Soft Skills Match (2%)
  - AI Confidence Level (5%)
- **Recruiter Actions**: Shortlist, reject, and update applicant statuses with non-destructive ranking synchronization.
- **Sanitized CSV Export**: Download applicant rankings with automatic formula-injection sanitization (CWE-1236 protection against spreadsheet command execution).
- **Interactive Visual Analytics**: Responsive bar and pie charts illustrating application volume and candidate status distribution.

### 👤 For Candidates
- **Opportunity Directory**: Search active vacancies with live filtering by keywords, skills, and locations.
- **One-Click Application**: Apply instantly using uploaded and parsed resumes.
- **Resume Portfolio & AI Diagnostics**: Upload resumes (PDF/DOCX), inspect parsed entities (skills, experience, contact info), and run instant match simulations against any job description.
- **Application Status Tracker**: Live dashboard displaying submission statuses, overall AI match percentages, and evaluation breakdowns.

### 🛡️ For System Administrators
- **Administrative Portal**: Platform-wide monitoring of total users, active jobs, and submitted applications.
- **Account Management**: View registered candidates and employers, with guarded user deletion (root admin self-deletion prevention) and cascading cleanup.

---

## 🏗️ Architecture & Technology Stack

HireSense AI strictly preserves and hardens the modern **MERN** stack:

```
[ Frontend: React 19 + Vite 8 + Tailwind CSS v4 ]
                      │
           (RESTful JSON over HTTP)
                      │
[ Backend: Node.js + Express 5 + Security Middleware ]
       │                                  │
[ MongoDB Atlas (Mongoose 9) ]    [ Google Gemini 2.0 Flash ]
```

| Layer | Technologies | Key Optimizations |
|---|---|---|
| **Frontend** | React 19, React Router 7, Vite 8, Tailwind CSS v4, Recharts | Route-level lazy loading (`React.lazy`), Base64URL JWT decoder, initial JS bundle reduced by **68%** (809 kB → 254 kB) |
| **Backend API** | Node.js, Express 5, Express Validator, Helmet, HPP | Strict CORS origin whitelisting, rate limiting (100 auth / 500 api per 15 min), sanitized inputs |
| **Database** | MongoDB Atlas, Mongoose 9 | Google DNS fallback on Windows (`dns.setServers`), compound indexes on Jobs, Applications, and Resumes, lean projections (`.select('-rawText')`) |
| **AI Integration** | Google Gemini 2.0 Flash | Structured JSON schema enforcement, SHA-256 prompt hashing cache, `<untrusted_candidate_resume>` boundary isolation |
| **Security** | JWT, bcrypt, File Magic Bytes | BOLA object-level access guards, sanitized CSV export (`=, +, -, @` neutralizer), PDF/DOCX magic byte validation |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ (tested on Node.js v20+)
- **MongoDB** cluster (local or MongoDB Atlas)
- **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))

### 1. Clone & Setup Repository
```bash
git clone https://github.com/your-username/HireSense.git
cd HireSense
```

### 2. Configure Backend
```bash
cd backend
npm install
```

Create `.env` based on `.env.example`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/hiresense_ai?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
GEMINI_API_KEY=your_gemini_api_key_here
```

Run backend automated tests:
```bash
npm test
```

Start the backend server:
```bash
npm run dev
# Server running at http://localhost:5000
```

### 3. Configure Frontend
In a new terminal window:
```bash
cd frontend
npm install
```

Create `.env` based on `.env.example`:
```env
VITE_API_URL=http://localhost:5000/api
```

Run linter and production build:
```bash
npm run lint
npm run build
```

Start Vite development server:
```bash
npm run dev
# Application running at http://localhost:5173
```

---

## 🧪 Test Suite

HireSense AI includes an automated unit and security test suite using Node's native test runner (`node:test`):

```bash
cd backend
npm test
```

### Test Coverage Highlights
- **Authentication & Privilege Escalation**: Validates email trimming/lowercasing, token verification, and blocks unauthorized `role: "admin"` self-assignment.
- **CSV Formula Injection**: Ensures cells beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` are sanitized with leading single quotes.
- **Deterministic 11-Dimension Scoring**: Verifies weighted composite score math, bounds clamping (0-100), and qualitative recommendation thresholds.
- **Magic Byte File Integrity**: Tests byte-level inspection of real `%PDF` and `PK\x03\x04` headers against spoofed text files.

---

## 🔒 Security Hardening Summary

1. **Privilege Escalation Protection**: Public registration is restricted to `candidate` or `employer`.
2. **Broken Object-Level Authorization (BOLA)**: Resume downloads and ranking updates explicitly verify user ownership or employer role.
3. **Prompt Injection Boundary Protection**: Candidate resume text is wrapped in `<untrusted_candidate_resume>` tags with explicit model instructions to ignore instructions contained inside resume bodies.
4. **CSV Export Injection Mitigation**: Adheres to OWASP recommendations by neutralizing active formula characters.
5. **Safe JWT Decoding**: Frontend replaces native `atob()` with RFC 7515 compliant Base64URL decoder, preventing unexpected session crashes on valid tokens.
6. **Windows Atlas DNS Reliability**: Configures primary DNS resolvers to Google DNS (`8.8.8.8`, `8.8.4.4`) to prevent SRV lookup timeouts on Windows hosts.

---

## 📄 License
This project is licensed under the MIT License.
