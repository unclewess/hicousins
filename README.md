# hiCousins 🇰🇪

> Mobile-first installable Progressive Web App (PWA) designed for Kenyan self-help groups (chamas) to govern finances, statements, dual-treasurer controls, meetings, votes, and records.

[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Acceptance%20Tests%2014%2F14%20Passing-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev/)

---

## 📋 Overview

**hiCousins** digitizes traditional chamas starting with **Ndhuhulu Self-Help Group** as the pilot benchmark. It replaces error-prone spreadsheets with an append-only ledger, strict multi-role governance, and mobile member access.

### Key Features
- **Dual-Treasurer Confirmation**: When a treasurer records a payment or expense, the system strictly blocks self-confirmation. A second, different treasurer must confirm the entry before it updates member shares or statements.
- **Strict Member Privacy**: Powered by PostgreSQL Row-Level Security (RLS), members can exclusively view their own individual statements. Group totals are aggregated, but individual member balances are private.
- **Accurate Financial Formulas**:
  - **Shares**: 1 share = KES 100 of Contribution = 1 month covered, allocated FIFO from member join date.
  - **Arrears & Traffic Lights**: 🟢 Current (0 mo), 🟡 Behind (1–2 mo), 🔴 Severe (3+ mo).
  - **Compound Penalties**: $10,100 \times (1.01^N - 1) - 100 \times N$ with one-month grace from `2025-10-01`.
  - **Financial Year Calculation**: Derived strictly from payment date (Oct 1 to Sep 30), never sheet position.
  - **Money In & Treasurer Debt**: `money_in = Contributions + Admin Income + Penalty Payments`. Debt repayments are tracked separately and excluded from money in to prevent double-counting.
- **Pilot Mode A/B**:
  - **Pilot Mode A (Default)**: The official Google Sheet remains the source of truth; the app operates as a verified real-time mirror with idempotent re-import.
  - **Pilot Mode B**: The app becomes the primary ledger when officials agree.
- **WhatsApp Invites & QR Onboarding**: Shareable invite links allow members to claim their roster profile using Google Sign-In with mandatory Kenya Data Protection Act 2019 consent.
- **Mobile-First PWA**: Installable directly to the home screen on Android and iOS with offline capability.

---

## 🏛️ Ndhuhulu Pilot Officials & Governance

| Role | Official Name | Member ID | Governance Scope |
|---|---|---|---|
| **President** | Winnie Mbidhi | `mem-ndh-014` | Governance oversight, role terms, member approvals |
| **Vice President** | Mark O. Okello | `mem-ndh-016` | Administrative oversight & backup administration |
| **Treasurer 1** | Wesley Mbidhi | `mem-ndh-013` | Records collections & expenses (requires Treasurer 2 confirmation) |
| **Treasurer 2** | Collins Oduka | `mem-ndh-029` | Confirms collections & expenses (requires Treasurer 1 confirmation) |
| **Secretary** | Sandra Achieng | `mem-ndh-017` | Member roster records & communications |
| **Organizing Secretary** | Aaron Oduor | `mem-ndh-004` | Event scheduling & logistical notices |
| **Chief Whip 1** | Eugene Nyasio | `mem-ndh-040` | Arrears follow-ups & meeting discipline *(vacant 2nd whip handled)* |
| **Auditor** | Noel Oduor | `mem-ndh-008` | Read-only audit oversight & discrepancy flagging *(vacant 2nd auditor handled)* |

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v18+` (Tested on `v24.11.1`)
- npm `v9+`

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/<your-username>/hicousins.git
cd hicousins
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

To access on your phone via local Wi-Fi:
```bash
npm run dev -- --host 0.0.0.0
```

### 3. Run Acceptance Tests
To run all 14 Phase 1 acceptance tests against the Ndhuhulu benchmark:
```bash
npm test
```

### 4. Build for Production
```bash
npm run build
```

---

## 🗄️ Supabase Backend Migration

To connect hiCousins to Supabase with real PostgreSQL Row-Level Security:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase project dashboard.
3. Run the migration script located at [`supabase/migrations/20261026_init_schema.sql`](supabase/migrations/20261026_init_schema.sql).
4. Enable **Google Sign-In** under **Authentication > Providers > Google**.
5. Copy `.env.example` to `.env.local` and add your project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## 🧪 Acceptance Benchmark Verification (25 Oct 2026)

All 14 acceptance criteria are validated automatically:
- Active Members: **66**
- Total Shares: **2,483**
- Contributions: **KES 248,300**
- Admin Income: **KES 7,500**
- Debt Repaid: **KES 2,000**
- Penalties Charged / Collected: **KES 706 / KES 706**
- Total Money In: **KES 256,506** (Debt repayments excluded)
- Members in Arrears: **42** (Total Active Arrears: **KES 64,600**)
- Aaron Oduor: **36 shares, 10 mo behind, KES 1,000 arrears, KES 46.22 penalty**
- Fred Michael: **4 mo behind (🔴 Red)** | Edith Hwaga: **2 mo behind (🟡 Yellow)**
- Two-Treasurer Security: Self-confirmation blocked at both app and database levels
- Privacy: Normal members blocked from reading other members' records

---

## 📄 License
MIT License. Built for African Chamas and Self-Help Groups.
