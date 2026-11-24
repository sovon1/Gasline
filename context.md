# GasLine — Complete Hackathon & Codebase Context (`context.md`)

> **Purpose**: High-density single-file context dump so any AI assistant/model can skip codebase & rulebook exploration and start executing immediately with minimal tokens.
> **Last Updated**: 2026-11-24 (Final Day on-site at Comilla University)

---

## 1. Team, Event & Pitch Context

### Team: **NSTU WINTERFELL**
- **University**: Noakhali Science and Technology University (NSTU) — Dept. of Computer Science & Telecommunication Engineering (CSTE)
- **Members**:
  1. **Md. Shahidul Islam Shovan** (`ASH2301019M`) — Team Leader
  2. **Syeda Samiha Kader Chowdhury** (`BKH2301002F`) — Member
  3. **Shariar Ebtasam** (`ASH2301020M`) — Member
- **GitHub Repo**: `https://github.com/sovon1/Gasline` (branch `main`)

### Event: **CoU AI Hackathon 2026** (*CoU TechNova 2026 — "AI for Humanity"*)
- **Venue & Organizer**: Faculty of Engineering, Comilla University, Cumilla, Bangladesh. (Title sponsor: Gigabyte AORUS · Powered by IT Palace).
- **Format & Live Status (`https://coutechnova.xyz/`)**:
  - 3-day pre-build (`21–23 Nov 2026`) + **5-hour on-site final TODAY (`24 Nov 2026`)**.
  - Website shows **44 teams** shortlisted (PDF originally said 30). Prize pool: **BDT 25,000** (`1st: 10k`, `2nd: 8k`, `3rd: 7k`).
  - **Final Day Flow**: Check-in → Opening → Final briefing → 5h Final build → Mentoring → Strict Submission Deadline → Live Demos → Judging → Awards.
- **Tracks**:
  - Website `/challenges` (6 tracks): Healthcare & Wellbeing, Education & Learning, Agriculture & Food, **Climate & Environment**, Finance & Inclusion, **Open Innovation** *(primary fit for GasLine; Climate & Environment secondary via Crisis-Carbon / Diesel optimization)*.
  - Rulebook PDF (10 suggested domains): #8 Environment, #10 Business & Industry.
- **Judging Criteria**:
  - Phase 1 (100 pts): Problem relevance (20), Innovation (25), AI application (25), Feasibility (15), Potential impact (15).
  - Final Day: **Working solution**, **meaningful use of AI** (not a bare prompt wrapper), **quality of execution**, and **presentation/defense**.

### Official Rulebook Key Rules (`CoU_AI_Hackathon_2026_Rulebook_Revised.pdf`)
*(Note: User expects some rules may be loosely enforced on-site, but keep in mind for safety)*
- **Rule 9 (AI & Data)**:
  - Coding assistants (ChatGPT, Claude, Gemini, Copilot, Cursor, Antigravity, etc.) and external LLM APIs (Gemini, Groq, OpenAI, Ollama) are **allowed** — **must be disclosed in `README.md`**.
  - **"Real AI only"**: Hard-coded, pre-recorded, or human-faked AI output is grounds for disqualification. Understand & explain what you built.
  - Public/licensed/own data must be credited.
- **Rule 10 (GitHub Repo & README)**:
  - Public repo created on/after 21 Nov; regular commits (ideally from each member's account, hourly during final); no force-push/squash; never commit keys (`.env.example` required — already present).
  - `README.md` must contain: Project/team/member names, Problem & solution summary, Features & how AI works, Tech stack/models/APIs/datasets, **AI tools used & for what**, **Third-party code/assets credited**, **Setup steps, live link, demo video**.
- **Rule 11 & 12 (Deployment & Final Submission Checklist)**:
  1. Title & short description (**max 150 words**)
  2. Public GitHub repo link (`https://github.com/sovon1/Gasline`)
  3. **Live deployment link** (Vercel/Render/Railway/HF Spaces etc.) **OR** a **demo video (max 3 mins)** if not deployable
  4. Test login credentials (N/A — GasLine has no login gate)
  5. **AI tools & models disclosure**
  6. Demo video (optional if deployed, max 3 mins; keep local copy + recording as network backup; live demo must run real project)

---

## 2. Original Idea Proposal Summary (`hackathon idea submisison.md`)

- **Core Pitch**: Bangladesh's **$39B RMG sector** (>80% of exports) faces severe gas pressure drops (**1–3 PSI actual vs. 10–15 PSI required**). BKMEA survey (Aug–Sep 2026): **78%** partial shutdowns, **87%** shipment delays, **55%** orders cancelled/reduced; stage losses: **dyeing −51%**, **knitting −37/38%**, **sewing −40%**. Missing a sea vessel jumps freight **~20×** (`$0.30–0.35/kg` sea vs. `$6.00–7.50/kg` air; modeled at `$6.65/kg` differential), while diesel steam costs `~৳34/unit` vs. `৳14–15/unit` gas.
- **Novelty Claim (Honest Positioning)**:
  - **EG Planner / FastReact** track garment capacity & late orders — *zero energy variable*.
  - **iFactory / HOMER Pro** optimize electricity/microgrids — *no gas, no ship dates, no order-level air-freight economics*.
  - **GasLine** connects: *(1) Announced/zone gas shocks (`mmcfd` & `PSI`)* → *(2) Non-linear process capacity collapse (Model A)* → *(3) Calibrated order late-shipment probability & conformal days-late bounds (Model B)* → *(4) Counterfactual OR rescue ranking in USD/BDT (Component C)*.
- **Home-Court Final Ask (§08)**: **1-month pilot at Cumilla EPZ / BKMEA knit factories** using their existing Excel order sheet to retrain GasLine from calibrated-synthetic data onto live ERP/production logs.
- **Proposal vs. Implementation Alignment**:
  - **Implemented Core & Surfaces**: Model A + Model B + Conformal intervals + Buyer Exposure + 5-lever OR Optimizer + Shock Console (5 cited shocks) + Promise-Date Engine + 24h Diesel Timing Optimizer + Buyer Trust & Crisis-Carbon A4 Report + Bilingual Bangla WhatsApp/Email Alerts + CPA Port Buffer + 4-Zone Cluster Switcher & GIS Map + Shopfloor Photo Preview & Tap-to-Confirm Grid (`VisionScanModal`).
  - **Cut per Proposal §07 Cut-Line**: Dedicated *Air-Pooling calculator* omitted; *Group Factory Reallocation* represented via 4-zone Plant Cluster switcher + National GIS Map.
  - **Added Beyond Proposal**: Bilingual *Force Majeure Evidence Dossier* (`BERC Act 2003 §42` / `CISG Art. 79`), *Multi-LLM + Offline ReAct AI Copilot* with TTS & action chips, *IEEE Research Paper PDF* (`frontend/public/gasline_ieee_paper.pdf`), `⌘K` *Command Palette*, and *Worker Welfare Shield KPI*.

---

## 3. Directory Map (`c:\Users\sovon\Desktop\gasline`)

```text
c:\Users\sovon\Desktop\gasline\
├── .env.example                        # Optional LLM API keys template (GEMINI/GOOGLE/GROQ/OPENAI)
├── .gitignore                          # Ignores .gemini/, .env*, .venv/, __pycache__/, node_modules/, .next/
├── LICENSE                             # MIT
├── README.md                           # 310-line flagship docs (missing explicit AI coding tool disclosure & live link)
├── context.md                          # THIS FILE
├── demo_shopfloor_whiteboard.jpg       # Untracked sample whiteboard image for VisionScanModal demo
├── .github/workflows/ci.yml            # CI: backend 48-test + CPU retrain + Next.js tsc & build
├── docs/
│   ├── ARCHITECTURE.md                 # ML math, thermodynamic fallback equations, conformal & OR specs
│   ├── DATA_SOURCES.md                 # Dataset provenance matrix, shock URLs & Cumilla EPZ pilot plan
│   ├── assets/banner.svg               # Hero SVG banner
│   └── screenshots/                    # dashboard-light.png, rescue-dark.png (1440x900)
├── backend/
│   ├── requirements.txt                # fastapi, uvicorn, pydantic, scikit-learn, pandas, numpy, joblib, httpx, python-multipart
│   ├── data/
│   │   ├── uci_garment_productivity.csv # Real Bangladeshi factory dataset (1,199 rows, 15 cols, DOI 10.24432/C51S6D)
│   │   ├── bkmea_shocks.csv             # 5 cited Petrobangla/BKMEA shock presets (#1..#5)
│   │   ├── daily_capacity.csv           # 90-day seeded (seed=42) PSI & stage capacity series
│   │   └── simulated_orders.csv         # 60 seeded export lots (ORD-2026-001..060) across 4 buyers & 4 styles
│   ├── models/
│   │   ├── model_a_capacity.pkl         # Dict: {'models': {dyeing, knitting, sewing}, 'features': [...]}
│   │   ├── model_b_classifier.pkl       # HistGradientBoostingClassifier -> P(is_late)
│   │   ├── model_b_regressor.pkl        # HistGradientBoostingRegressor -> predicted_days_late
│   │   └── model_metadata.json          # 11 features, conformal q85=4.19/q90=5.38/q95=7.59/q97=9.94, AUC=0.9991, Acc=0.9867, MAE=2.12
│   └── src/
│       ├── simulator.py                 # Generates daily_capacity.csv & simulated_orders.csv (seed=42)
│       ├── train_models.py              # Trains Model A (90d) + Model B (6,000 synthetic rows across 10-105d, 70/15/15 split)
│       ├── optimizer.py                 # Model A/B inference, quote-promise forward sweep, & 9-scenario minimax-regret rescue engine
│       ├── server.py                    # 16-endpoint FastAPI app (/api/quote-promise, unconfirmed shock support, ReAct copilot)
│       ├── test_verification.py         # ~1s smoke check
│       └── test_backend.py              # 56-test offline unittest suite via FastAPI TestClient
└── frontend/
    ├── package.json                    # next@16.4.6, react@19.3.0, @tailwindcss/turbopack@4.3.3, react-markdown
    ├── next.config.ts                  # Turbopack CSS rule config
    ├── app/
    │   ├── layout.tsx                  # Root shell, Inter + JetBrains Mono + Hind Siliguri fonts, theme init script
    │   ├── globals.css                 # Tailwind v4 + CSS light-dark(), <dialog>, [popover], scroll-driven shadows
    │   └── page.tsx                    # Main SPA state orchestrator (914 lines)
    ├── components/
    │   ├── Header.tsx                  # Cluster popover, ⌘K, Scan, Copilot, Crisis Demo, EN/বাং, Audio, Theme, Telemetry
    │   ├── MetricsOverview.tsx         # 5 KPI cards (PSI, At-Risk Lots, USD/Cr BDT Exposure, 5 Levers, Worker Shield)
    │   ├── PipelineFlow.tsx            # Animated 4-stage SCADA SVG (Boiler -> Dyeing -> Knitting -> Sewing)
    │   ├── ShockConsole.tsx            # 5 shock preset buttons, Auto-Sense IoT toggle, 1.0-15.0 PSI slider
    │   ├── OrderLedger.tsx             # Filterable, sortable, buyer-grouped order book table + CSV export
    │   ├── RescueDrawer.tsx            # Slide-over drawer: Ranked Plans, Visual Gantt, SHAP Attribution + Dispatch
    │   ├── AuditModal.tsx              # Printable A4 Buyer Trust & Higg Crisis-Carbon report
    │   ├── AddGarmentModal.tsx         # Manual custom order entry (6 presets) + Bulk CSV upload
    │   ├── DieselScheduler.tsx         # Tab 2: 24h diurnal pressure curve & smart diesel burn calculator
    │   ├── PromiseDateEngine.tsx       # Tab 3: Pre-PO merchandiser lead-time quoter (+2.62d conformal buffer)
    │   ├── BenchmarkView.tsx           # Tab 4: ROC-AUC/MAE cards, τ threshold slider, ablation & ERP matrix
    │   ├── NationalMap.tsx             # Tab 5: Bangladesh GIS corridor SVG map (4 clickable industrial clusters)
    │   ├── AiCopilotModal.tsx          # Bilingual ReAct Copilot drawer (Gemini/Groq/OpenAI/Ollama + offline engine)
    │   ├── VisionScanModal.tsx         # Whiteboard photo preview + 3 presets + 6-field Tap-to-Confirm grid
    │   ├── ForceMajeureModal.tsx       # Bilingual BERC §42 / CISG Art. 79 A4 Evidence Dossier (iframe PDF print)
    │   ├── CommandPalette.tsx          # ⌘K / Ctrl+K launcher across actions, tabs, clusters, and orders
    │   ├── ModalDialog.tsx             # Native <dialog> modal & drawer wrapper
    │   ├── ToastProvider.tsx           # Toast context notifications
    │   ├── AnimatedCounter.tsx         # rAF cubic-ease counter
    │   └── Icons.tsx                   # 35+ inline SVGs (zero icon library dependencies)
    ├── data/
    │   ├── clusters.ts                 # 4 zones: Gazipur (2.1), Narayanganj (2.4), Savar (3.2), Chattogram KEPZ (6.5 PSI)
    │   ├── initial_orders.json         # Offline bundle of all 60 simulated export orders
    │   └── translations.ts             # Full EN / বাংলা UI dictionary
    ├── public/gasline_ieee_paper.pdf   # IEEE-format research paper
    └── utils/
        ├── api.ts                       # Shared API_BASE (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000")
        ├── plainDate.ts                 # Timezone-safe calendar math (native Temporal.PlainDate + pure Julian/Gregorian fallback)
        ├── audio.ts                     # Web Audio API emergency siren & success chime (ScadaAudio)
        └── theme.ts                     # 2-state light/dark color-scheme manager
```

---

## 4. Runtime, Commands & Environment

- **Host Environment**: Windows, PowerShell, Python `3.12.10` (global packages installed, no `.venv` folder currently created), Node `v24.14.0`, npm `11.9.0` (`frontend/node_modules` & `frontend/.next` already installed/built).
- **Active Local Servers** (check before starting duplicates):
  - Backend: `http://127.0.0.1:8000` (`uvicorn server:app --app-dir backend\src --host 127.0.0.1 --port 8000`)
  - Frontend: `http://localhost:3000` (`cd frontend; npm run dev` or `npm run build; npm run start`)
- **Verification & Retrain Commands**:
  - Smoke check (~1s): `python backend\src\test_verification.py`
  - Full 48-test suite (~25s, offline): `python backend\src\test_backend.py`
  - Retrain ML models (~3s on CPU): `python backend\src\train_models.py`
  - Regenerate CSVs (`seed=42`): `python backend\src\simulator.py`
- **Optional Env Vars** (only for live LLM in Copilot; 100% offline works without any):
  - Backend `os.getenv`: `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`
  - Frontend `localStorage`: `color-scheme`, `gasline_ai_provider`, `gasline_ai_model`, `gasline_ollama_url`, `gasline_gemini_api_key`, `gasline_groq_key`, `gasline_openai_key`.

---

## 5. Backend ML, OR Math & API Reference (`backend/src/`)

### 5.1 Model A — Process Capacity Forecaster (`optimizer.py` / `train_models.py`)
- **Models**: 3 × `HistGradientBoostingRegressor` (`dyeing`, `knitting`, `sewing`), clipped to `[0.05..0.98]`, `[0.10..0.98]`, `[0.20..0.98]`.
- **5 Input Features**: `gas_pressure_psi`, `national_supply_mmcfd`, `rolling_psi_3d`, `psi_lag1`, `is_outage_zone` (`1` if `psi < 4.0` else `0`).
- **Thermodynamic Fallback** (if `.pkl` missing):
  - `psi < 4.0`: `dyeing = max(0.10, 0.49*(psi/4))`, `knitting = max(0.20, 0.63*(psi/4))`, `sewing = 0.60`
  - `4.0 <= psi < 8.0`: linear interpolation up to `0.89 / 0.90 / 0.90`
  - `psi >= 8.0`: `0.95 / 0.98 / 0.95`

### 5.2 Model B — Order Late-Risk & Conformal Delay Engine
- **Models**: `HistGradientBoostingClassifier` (`prob_late`) + `HistGradientBoostingRegressor` (`predicted_days_late`, clipped `>= 0`).
- **11 Input Features** (`BASE_DAILY_LINE_CAPACITY_MINS = 7056.0` = `20 workers × 480m × 0.735 UCI eff`):
  1. `quantity`, 2. `weight_kg`, 3. `base_smv`, 4. `gas_intensity_code` (`LOW:0, MEDIUM:1, HIGH:2, EXTREME:3`), 5. `lead_days`, 6. `avg_window_psi`, 7. `avg_dyeing_capacity`, 8. `workload_minutes = quantity * base_smv`, 9. `standard_days = workload_minutes / 7056.0`, 10. `workload_ratio = standard_days / max(1, lead_days)`, 11. `lead_slack = lead_days - standard_days`.
- **Conformal Interval**: Split-conformal on 750 calibration samples at $\alpha=0.10$ → **`conformal_q90 = 2.62` days** (`[max(0, pred - 2.62), pred + 2.62]`).
- **Holdout Metrics (`model_metadata.json`)**: `ROC-AUC = 0.9998`, `Accuracy = 0.9933`, `Precision = 0.9948`, `Recall = 0.9922`, `MAE = 1.06 days` (vs. `6.37d` raw GBDT without domain interaction features).
- **Risk Status Buckets**: `CRITICAL` (`prob_late >= 0.65` or `days_late >= 3.0`), `WARNING` (`prob_late >= 0.35` or `days_late >= 1.0`), else `SAFE`.
- **Attribution (`compute_shap_attribution`)**: Deterministic marginal decomposition normalized to 100% across `Dyeing Gas Shock`, `Lead Time Slack`, `SMV Complexity`, `Batch Volume Load`.

### 5.3 Component C — Operations Research Optimizer (`evaluate_rescue_plans`)
- **Constants**: `AIR_FREIGHT_DIFF_PER_KG = $6.65`, `USD_TO_BDT = 120.0`.
- **Baseline Financial Exposure**: `(weight_kg * 6.65 if prob_late > 0.4 else 0) + (days_late * penalty_per_day_usd)`.
- **5 Candidate Levers** (each perturbs `(dyeing_cap, psi, lead_days)`, re-runs `predict_order_risk()`, ranks by `net_saving_usd = avoided_loss_usd - action_cost_usd`; `recommended = net_saving > 0 and risk_reduction >= 20%`):
  1. `resequence_dyeing` (`$0` / `৳0`): `dyeing_cap = min(0.88, cap + 0.30)`, `psi = min(8.5, psi + 3.2)` (night off-peak shift)
  2. `line_split` (`$150` / `৳18,000`): `lead_days = round(lead * 1.45)` (2 parallel lines)
  3. `overtime_shift` (`$1,250` / `৳150,000`): `lead_days = round(lead * 1.25)` (+2h/day shift)
  4. `diesel_steam_boost` (`$1,890` / `৳226,800`): `dyeing_cap = 0.92`, `psi = 10.5` (backup diesel burner)
  5. `diesel_plus_overtime` (`$3,140` / `৳376,800`): `dyeing_cap = 0.94`, `psi = 11.0`, `lead_days = round(lead * 1.25)`

### 5.4 All 15 FastAPI Endpoints (`backend/src/server.py`)
1. `GET /health` — Health, `orders_loaded`, `shocks_available`, `model_accuracy`, `conformal_q90_margin_days`, `port_buffer_days`.
2. `GET /api/orders` — Sanitized list of active `orders_df`.
3. `GET /api/orders/{order_id}` — Case-insensitive single-lot lookup.
4. `POST /api/orders` — Accepts single order dict, list, or `{"orders": [...]}`; validates, runs Model A+B, prepends to in-memory `orders_df`.
5. `GET /api/shocks` — Returns 5 rows from `bkmea_shocks.csv` (`#1 Normal 12.0 PSI`, `#2 FSRU Fault 2.5 PSI`, `#3 Aug Avg 2.1 PSI [default]`, `#4 BKMEA Survey 2.0 PSI`, `#5 Summit LNG 1.6 PSI [Crisis Demo]`).
6. `POST /api/simulate-shock` — `{shock_id?, custom_psi?, custom_supply_mmcfd?}` → clamps PSI `[0.5, 25.0]`, runs Model A + re-scores all `orders_df` with Model B, returns `parameters`, `aggregate_impact`, `orders`.
7. `POST /api/rescue` — `{order_id?, custom_order?, current_psi?}` → returns baseline + 5 ranked rescue plans.
8. `GET /api/port-buffer` — Static CPA telemetry (`84.5%` yard occupancy, `3.8d` dwell, `2.5d` gate-in buffer, `48h` feeder cut-off).
9. `GET /api/benchmark` — Model metadata, 11 features, holdout metrics, and ablation deltas.
10. `POST /api/alert-text` — `{order_id?, custom_order?, top_plan_id?}` → `bangla_message` & `english_message`.
11. `POST /api/dispatch-alert` — Adds encoded `whatsapp_url` & `email_url` deep links.
12. `POST /api/copilot/chat` — Bilingual ReAct agent: regex/keyword SCADA tool execution (`simulate_shock`, `get_order_risk`, `optimize_rescue`, `query_port_buffer`, `generate_force_majeure_preview`, `query_model_registry`) + UI `cards` & `action_chips` + optional Gemini/Groq/OpenAI/Ollama synthesis (8s timeout) with deterministic EN/BN fallback.
13. `POST /api/copilot/models` — Live provider model discovery (3–5s timeout) or curated offline list.
14. `POST /api/vision/scan-card` — `{preset_id?, image_base64?, api_key?}` → returns 1 of 3 shopfloor presets scored live via Model B at `1.6 PSI`.
15. `POST /api/force-majeure` — `{order_id?, buyer?, custom_order?, custom_psi?, factory_name?}` → conformal bounds, Scope-1 diesel/CO₂ metrics, bilingual BERC Act 2003 §42 / CISG Art. 79 notices.

---

## 6. Frontend Architecture & Key Flows (`frontend/`)

- **Main State (`app/page.tsx`)**:
  - Boots instantly from `frontend/data/initial_orders.json` (60 orders at `2.1 PSI`), polls `GET /health` every 5s, hydrates `/api/shocks`, `/api/port-buffer`, and `POST /api/simulate-shock` (`shock_id: 3`).
  - **60fps Slider + Debounced Server Sync**: PSI changes run `computeLocalCapacities` + `simulateOrdersLocally` immediately on the client, then debounce (`180ms`) `POST /api/simulate-shock` guarded by `simRequestSeqRef` to prevent out-of-order response overwrites.
  - **URL Deep Links**: `/?order=ORD-2026-001` opens `RescueDrawer`; `/?order=ORD-2026-001&audit=...` opens `AuditModal`.
  - **"Crisis Demo" Button (`Header.tsx`)**: Triggers Web Audio emergency siren (`utils/audio.ts`), applies Shock `#5` (`1.6 PSI` Summit LNG Maintenance), and opens `RescueDrawer` on `ORD-2026-001`.
- **5 Operational Tabs**:
  1. `ORDERS`: `PipelineFlow` + `ShockConsole` + `OrderLedger` (search, status pills, buyer exposure filter strip, CSV export, Rescue/Inspect & Relief triggers).
  2. `DIESEL` (`DieselScheduler.tsx`): 24h diurnal pressure SVG (`+2.2 PSI` night recovery, `3.5 PSI` diesel cut-in), `৳90–140/L` fuel slider, daily savings vs. blind 24/7 burn *(client-side TS math)*.
  3. `PROMISE` (`PromiseDateEngine.tsx`): Merchandiser pre-PO quoter (`Projected Floor Days + 2.62d Conformal Buffer`) + 1-click quote defense copy *(client-side TS math)*.
  4. `BENCHMARK` (`BenchmarkView.tsx`): Pulls `/api/benchmark`, links `/gasline_ieee_paper.pdf`, interactive cost-threshold `τ` slider, feature ablation bars, ERP comparison table.
  5. `MAP` (`NationalMap.tsx`): Bangladesh GIS corridor SVG with 4 clickable clusters (`Gazipur`, `Narayanganj`, `Savar`, `Chattogram KEPZ`) triggering zone PSI simulation.

---

## 7. Known Technical Quirks, Mocked Parts & Submission Checklist Gaps

1. **`README.md` Rulebook Gaps (Easy Fix)**:
   - Missing explicit **AI Coding Assistants & Models Disclosure** section (Rule 9.1, 10.7, 12.5 — e.g., disclosing Gemini / Antigravity / coding assistants used during build + optional Gemini/Groq/OpenAI/Ollama in Copilot).
   - Missing explicit **Third-Party Code & Assets Credits** section (Rule 10.9 — Next.js, FastAPI, scikit-learn, Tailwind, Google Fonts, UCI dataset).
   - Missing **Live Deployment Link / Demo Video Link** placeholders (Rule 10.10, 11.1, 12.3).
2. **Hardcoded `http://127.0.0.1:8000` in 7 Frontend Files**:
   - Located in: `app/page.tsx`, `components/RescueDrawer.tsx`, `components/AddGarmentModal.tsx`, `components/BenchmarkView.tsx`, `components/AiCopilotModal.tsx`, `components/VisionScanModal.tsx`, `components/ForceMajeureModal.tsx`.
   - *Impact*: Works locally and degrades gracefully to offline client mode if deployed to Vercel alone, but connecting a deployed Vercel frontend to a deployed Render/Railway backend requires `process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"`.
3. **Shopfloor Scan Wording vs. Rule 9 ("Real AI Only")**:
   - `POST /api/vision/scan-card` ignores `image_base64` and scores 1 of 3 presets (`preset_1`..`preset_3`) via Model B. `README.md` honestly calls this *Photo Preview + Tap-to-Confirm*, **but** `CommandPalette.tsx` and `server.py` docstrings still say `"Optical OCR / Multimodal Vision"`. Aligning UI copy avoids any judge misunderstanding.
4. **Copilot `.env` Key Precedence Bug (`backend/src/server.py` line 929)**:
   - `api_key_to_use = req.api_key or os.getenv("GEMINI_API_KEY") or ...` grabs `GEMINI_API_KEY` even when `req.provider` is `"groq"` or `"openai"`. Should match `req.provider` first (like `/api/copilot/models` does).
5. **Ephemeral In-Memory State & Transient Banner Action**:
   - `POST /api/orders` mutates `orders_df` in RAM only (resets on backend restart).
   - Clicking `Auto-Deploy Zero-Cost Shift` in the `<3.0 PSI` emergency banner (`handleAutoDeployRescue` in `page.tsx`) subtracts `3.5d` in React state only, overwritten on next `/api/simulate-shock`.
6. **Client-Side Calculators vs. Backend Model B**:
   - `DieselScheduler.tsx`, `PromiseDateEngine.tsx`, and `AuditModal.tsx` use client-side TypeScript formulas rather than calling backend endpoints; `compute_shap_attribution()` in `optimizer.py` is a deterministic marginal formula rather than `shap.TreeExplainer`.
7. **Force Majeure Copy Mismatch**:
   - `ForceMajeureModal.tsx` A4 print header carefully says `"EVIDENCE DOSSIER · DRAFT FOR REVIEW"`, while `server.py`'s raw copy/WhatsApp strings still say `"legally enforceable... STATUTORY IMMUNITY ACTIVE"`.
8. **Git Working Tree**:
   - `demo_shopfloor_whiteboard.jpg` (and now `context.md`) are untracked; decide whether to commit or `.gitignore` `context.md` before final submission push.

---

## 8. On-Site Final Judge Paper Slip (#28 NSTU Winterfell) — IMPLEMENTED & TESTED

### Exact Judge Prompt (Received on-site 24 Nov 2026)
- **Team**: `28. NSTU Winterfell`
- **Idea**: GasLine — the energy-shock order-rescue system for garment factories
- **One-line summary**: Predicts which export orders the gas crisis will make late, then prices the cheapest rescue against air freight.
- **Challenges**:
  1. **Let a merchandiser enter a new order quote, and have GasLine return the ship date it can safely promise before accepting.**
  2. **Keep the rescue ranking honest when a shock event is announced with no confirmed duration or affected zone.**
- **Direction**: **Promise date at quotation time**

### What Was Built & Wired Up
1. **Primary Direction Elevated (`page.tsx` & `Header.tsx`)**:
   - `PROMISE` (*Pre-PO Quoting Engine*) is now **Tab 1** by default + has a dedicated **`Quote PO`** button in `Header.tsx`.
   - Accepting a quote calls `POST /api/orders`, plays the confirmation chime, inserts the PO at the top of the live Order Book, and switches to `ORDERS` (or opens `RescueDrawer` when accepting buyer's tight date with rescue).
2. **Challenge 1 — Backend ML Forward-Sweep Quote Engine (`POST /api/quote-promise`, `compute_quote_promise` in `optimizer.py`, `PromiseDateEngine.tsx`)**:
   - Retrained Model B across `6,000` orders spanning `10–105` lead days (`ROC-AUC=0.9991`, `Acc=98.67%`, `MAE=2.12d`) with calibrated multi-tier split-conformal margins: `q85=±4.19d`, `q90=±5.38d`, `q95=±7.59d`, `q97=±9.94d`.
   - Sweeps candidate horizons through **Model A → Model B** + CPA Port Gate-in Buffer (`+2.5d`) + Factory WIP Queue Load, returning exact calendar ship dates (`YYYY-MM-DD`) at **50% Floor**, **85% Commercial**, **90% Conformal Recommended**, and **97% Bulletproof**, an interactive SVG confidence curve, and a **Pre-Signing Rescue FOB Table** (`+$USD/pc` markup to keep buyer's tight date).
   - Uses `frontend/utils/plainDate.ts` (`Temporal.PlainDate` + integer Julian/Gregorian fallback) for zero-timezone-drift calendar date sync.
3. **Challenge 2 — Honest Uncertainty-Aware Rescue Ranking (`evaluate_rescue_plans` in `optimizer.py`, `/api/rescue`, `ShockConsole.tsx`, `RescueDrawer.tsx`)**:
   - Supports `shock_mode="unconfirmed"` (`duration_confirmed=False`, `zone_confirmed=False`, `duration_min_days`, `duration_max_days`, `zone_hit_prior`) across `ShockConsole`, `PromiseDateEngine`, and `RescueDrawer` (including an in-drawer toggle + **3×3 `Scenario Grid` tab**).
   - Evaluates all 5 rescue levers across the **9-scenario (`Zone Spared / Spillover / Direct Hit` × `Short / Medium / Prolonged Duration`)** matrix with duration-scaled diesel/overtime costs and sunk mobilization penalties.
   - Replaces fake single-point ROI with `net_saving_range_usd` (`[worst .. best]`), `cost_range_usd`, `max_regret_usd`, and **2-Stage Honest Badges**: `Execute Now (No-Regret)` (`$0` Night Re-sequence, `$150` Line Split) vs. `Hold Cash · Stage Trigger` (`<3.5 PSI for >=24h` manifold gate for Diesel/Overtime).
4. **Automated Test Coverage (`backend/src/test_backend.py`)**:
   - Expanded from 48 to **56 automated tests** (`test_49`–`test_56` covering `/api/quote-promise`, FOB rescue pricing, unconfirmed shock horizon buffers, 9-scenario minimax-regret ranking, exposure envelopes, bilingual guardrail alerts, and Copilot tools).

