# Data Sources & Provenance

GasLine strictly separates **real published calibration datasets**, **published national energy shock records**, and **calibrated synthetic factory simulation** so judges, factory partners, and reviewers can audit every assumption.

---

## 1. Provenance Matrix

| File | Nature | Records | Source & Purpose |
|---|---|---:|---|
| [`backend/data/uci_garment_productivity.csv`](../backend/data/uci_garment_productivity.csv) | **Real empirical dataset** | `1,199` data rows (`15` columns) | Bangladeshi garment factory productivity dataset ([UCI ML Repository, DOI `10.24432/C51S6D`](https://doi.org/10.24432/C51S6D)). Used strictly to extract peacetime sewing/finishing baselines (mean productivity `~73.5%`, mean SMV `~15.06 min`, mean WIP `~1,190` pcs) rather than treated as the complete problem. |
| [`backend/data/bkmea_shocks.csv`](../backend/data/bkmea_shocks.csv) | **Real published shock events** | `5` crisis presets | Hand-curated library of Petrobangla and BKMEA crisis metrics with date, national supply (mmcfd), zone PSI, per-process loss percentages, and source URL on every row. |
| [`backend/data/daily_capacity.csv`](../backend/data/daily_capacity.csv) | **Calibrated physics time series** | `90` days (`2026-08-01`+) | Reproducible time series (`seed=42` in `simulator.py`) modeling normal baseline (`10–12 PSI`), August severe deficit (`1.5–2.5 PSI`), September volatility (`3–5 PSI`), Summit LNG maintenance (`1.0–2.0 PSI`), and partial recovery (`6–8 PSI`), mapped through BKMEA loss rates. |
| [`backend/data/simulated_orders.csv`](../backend/data/simulated_orders.csv) | **Calibrated synthetic order book** | `60` export lots | Reproducible order book (`seed=42`) across 4 buyer profiles (`Inditex (Zara)`, `H&M`, `Marks & Spencer`, `Primark`) and 4 garment archetypes (`Cotton Hoodie`, `Crewneck T-Shirt`, `Denim Jeans`, `Polo Shirt`), routed through `daily_capacity.csv` windows. |

---

## 2. Cited Energy Shock Catalog (`bkmea_shocks.csv`)

Every scenario in the Shock Console corresponds to a published baseline or energy disruption event:

| Shock ID | Event Name | Date | National Supply | Zone PSI (Actual / Req) | Dyeing Loss | Knitting Loss | Sewing Loss | Cited Source |
|---:|---|---|---:|---:|---:|---:|---:|---|
| `1` | Normal Operations | `2026-06-01` | `2,900 mmcfd` | `12.0 / 15.0` | `0.0%` | `0.0%` | `0.0%` | `https://petrobangla.org.bd` |
| `2` | FSRU Terminal Failure | `2026-07-21` | `2,450 mmcfd` | `2.5 / 15.0` | `51.0%` | `37.0%` | `40.0%` | [The Daily Star](https://www.thedailystar.net/business/economy/news/gas-crisis-hits-rmg-3663211) |
| `3` | August Low-Supply Average | `2026-08-15` | `2,235 mmcfd` | `2.1 / 15.0` | `55.0%` | `40.0%` | `45.0%` | [The Daily Star](https://www.thedailystar.net/business/economy/news/gas-supply-lowest-decade-3689401) |
| `4` | BKMEA Crisis Survey Period | `2026-09-01` | `2,300 mmcfd` | `2.0 / 15.0` | `51.0%` | `37.5%` | `40.0%` | [Daily Sun](https://www.dailysun.com/post/768901/78-factories-shut-down-energy-crisis) |
| `5` | Summit LNG Maintenance | `2026-11-04` | `2,250 mmcfd` | `1.6 / 15.0` | `60.0%` | `42.0%` | `48.0%` | [bdnews24](https://bdnews24.com/bangladesh/petrobangla-summit-lng-maintenance-nov-2026) |

---

## 3. Simulation Physics Assumptions (`backend/src/simulator.py`)

When generating `simulated_orders.csv` and the 5,000-order training corpus in `train_models.py`:

- **Factory Line Baseline**: 20 workers × 480 min/day × `0.735` mean UCI productivity = `7,056` effective minutes per standard line-day.
- **Gas-Sensitive Bottleneck Weighting**:
  - `HIGH` / `EXTREME` gas intensity garments (Hoodies, Polo Shirts, Denim Jeans): effective capacity weighted `60%` dyeing + `40%` sewing.
  - `MEDIUM` / `LOW` garments (Crewneck T-Shirts): weighted `30%` dyeing + `70%` sewing.
- **Commercial Penalty Calibration**:
  - Air vs. sea freight differential: `$7.00/kg` peak air freight vs. `$0.35/kg` sea freight (`$6.65/kg` extra freight penalty when vessel cut-off is missed).
  - Buyer lateness penalties: `$1,800`–`$3,000 USD/day` with buyer cancellation thresholds (`5`–`10` days).
  - Currency conversion: fixed `1 USD = 120 BDT`.

---

## 4. Closing the Real-Data Gap (Pilot Pathway)

Order-level buyer ERP ledgers and zone-level factory gas logs are private across the industry. GasLine addresses this cleanly in two stages:

1. **Seeded National Pressure Network**: The GIS corridor view currently uses four seeded industrial clusters (`Gazipur Industrial Zone` 2.1 PSI, `Narayanganj Knitwear Hub` 2.4 PSI, `Savar & Ashulia Cluster` 3.2 PSI, and `Chattogram Export Zone (KEPZ)` 6.5 PSI) explicitly badged `Seeded Pressure Network (BKMEA / Petrobangla)` in the UI; in production, multi-factory groups contribute daily PSI readings for their shared industrial corridors.
2. **Cumilla EPZ Pilot Plan**: Replacing synthetic order histories (`simulated_orders.csv`) with **one month of real merchandiser Excel/CSV order sheets** from a pilot Cumilla EPZ or BKMEA-member knit factory lets `train_models.py` retrain Model A and Model B directly on measured factory execution.
