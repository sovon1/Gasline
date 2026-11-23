from datetime import datetime, timedelta
from pathlib import Path
import random
import numpy as np
import pandas as pd

# Anchor DATA_DIR relative to this file:
# __file__ is in backend/src/simulator.py
# .parent is backend/src -> .parent is backend -> / "data" points to backend/data
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Set seed for reproducible, verifiable scientific simulation
np.random.seed(42)
random.seed(42)

print("🏭 [Simulator] Loading UCI Garment baseline parameters...")
uci_df = pd.read_csv(DATA_DIR / "uci_garment_productivity.csv")

# Extract real peacetime productivity baseline from UCI data
BASE_PRODUCTIVITY = float(uci_df['actual_productivity'].mean())  # ~0.735
BASE_SMV = float(uci_df['smv'].mean())                           # ~15.06 minutes
BASE_WIP = float(uci_df['wip'].dropna().mean())                  # ~1190 pieces

print(f"✅ Calibrated Baseline: Productivity = {BASE_PRODUCTIVITY*100:.1f}%, SMV = {BASE_SMV:.1f}m, WIP = {BASE_WIP:.0f}")

# 1. GENERATE 60 REALISTIC EXPORT ORDERS
BUYERS = [
    {"name": "Inditex (Zara)", "tier": "Tier-1 Fast Fashion", "penalty_per_day": 2500, "cancel_days": 7},
    {"name": "H&M", "tier": "High Volume Value", "penalty_per_day": 1800, "cancel_days": 10},
    {"name": "Marks & Spencer", "tier": "Quality Formal", "penalty_per_day": 2200, "cancel_days": 8},
    {"name": "Primark", "tier": "Budget High-Penalty", "penalty_per_day": 3000, "cancel_days": 5}
]

PRODUCTS = [
    {"type": "Cotton Hoodie", "smv": 24.5, "gas_intensity": "HIGH (Heavy Dyeing)", "weight_kg": 0.55},
    {"type": "Crewneck T-Shirt", "smv": 12.0, "gas_intensity": "MEDIUM", "weight_kg": 0.22},
    {"type": "Denim Jeans", "smv": 28.0, "gas_intensity": "EXTREME (Washing & Steam)", "weight_kg": 0.70},
    {"type": "Polo Shirt", "smv": 18.0, "gas_intensity": "HIGH", "weight_kg": 0.30}
]

START_DATE = datetime(2026, 8, 1)
DAYS_SIMULATED = 90

print("📦 [Simulator] Generating 60 Export Orders...")
orders = []
for i in range(1, 61):
    buyer = random.choice(BUYERS)
    product = random.choice(PRODUCTS)
    qty = random.randint(5000, 25000)
    price_per_piece = random.uniform(4.5, 12.0)
    total_val_usd = round(qty * price_per_piece, 2)
    
    # Lead time 45 to 75 days
    creation_offset = random.randint(0, 25)
    order_created = START_DATE + timedelta(days=creation_offset)
    lead_days = random.randint(45, 75)
    promised_ship_date = order_created + timedelta(days=lead_days)
    
    orders.append({
        "order_id": f"ORD-2026-{i:03d}",
        "buyer": buyer["name"],
        "product": product["type"],
        "quantity": qty,
        "total_weight_kg": round(qty * product["weight_kg"], 1),
        "total_value_usd": total_val_usd,
        "gas_intensity": product["gas_intensity"],
        "base_smv": product["smv"],
        "penalty_per_day_usd": buyer["penalty_per_day"],
        "cancel_threshold_days": buyer["cancel_days"],
        "created_date": order_created.strftime("%Y-%m-%d"),
        "promised_ship_date": promised_ship_date.strftime("%Y-%m-%d"),
        "lead_days": lead_days
    })

orders_df = pd.DataFrame(orders)

# 2. GENERATE 90 DAYS OF ENERGY CONDITIONS & PROCESS CAPACITIES
# Featuring real shocks: Summit maintenance, FSRU failure, August crisis
print("⚡ [Simulator] Simulating 90-day Gas Pressure & Process Curves...")
daily_logs = []

for day in range(DAYS_SIMULATED):
    current_date = START_DATE + timedelta(days=day)
    date_str = current_date.strftime("%Y-%m-%d")
    
    # Inject real shock periods from Petrobangla timeline:
    # Day 0-15: Normal summer baseline (10-12 PSI)
    # Day 16-35: August severe low gas (1.5-2.5 PSI)
    # Day 36-65: Volatile partial supply (3-5 PSI)
    # Day 66-72: Summit LNG Maintenance Shock (1.0-2.0 PSI)
    # Day 73-89: Recovery (6-8 PSI)
    
    if day < 15:
        psi = np.random.normal(11.5, 1.0)
        supply_mmcfd = np.random.normal(2850, 50)
    elif 15 <= day < 35:
        psi = np.random.normal(2.1, 0.4)       # Aug severe crisis
        supply_mmcfd = np.random.normal(2235, 40)
    elif 35 <= day < 65:
        psi = np.random.normal(4.2, 0.8)       # September volatile
        supply_mmcfd = np.random.normal(2450, 60)
    elif 65 <= day < 72:
        psi = np.random.normal(1.6, 0.3)       # Nov Summit shock
        supply_mmcfd = np.random.normal(2250, 30)
    else:
        psi = np.random.normal(7.5, 1.2)       # Moderate recovery
        supply_mmcfd = np.random.normal(2600, 70)
        
    psi = max(1.0, min(15.0, psi))
    
    # Process capacity response functions (BKMEA physics: Dyeing collapses first!)
    # Below 5 PSI, dyeing loses steam pressure rapidly:
    if psi < 4.0:
        dyeing_cap = 0.49 * (psi / 4.0)          # 51% loss (down to ~20-30%)
        knitting_cap = 0.63 * (psi / 4.0)        # 37% loss
        sewing_cap = 0.60                        # 40% loss
    elif 4.0 <= psi < 8.0:
        dyeing_cap = 0.70 + (psi - 4.0) * 0.05
        knitting_cap = 0.80 + (psi - 4.0) * 0.03
        sewing_cap = 0.82
    else:
        dyeing_cap = 0.95
        knitting_cap = 0.98
        sewing_cap = 0.95
        
    daily_logs.append({
        "date": date_str,
        "day_index": day,
        "gas_pressure_psi": round(psi, 2),
        "national_supply_mmcfd": round(supply_mmcfd, 1),
        "dyeing_capacity_factor": round(dyeing_cap, 3),
        "knitting_capacity_factor": round(knitting_cap, 3),
        "sewing_capacity_factor": round(sewing_cap, 3),
        "finishing_capacity_factor": round((dyeing_cap + sewing_cap)/2, 3)
    })

daily_df = pd.DataFrame(daily_logs)

# 3. CALCULATE SHIPMENT OUTCOMES FOR EACH ORDER
print("📦 [Simulator] Routing 60 orders through daily factory capacity...")
final_order_results = []

for _, order in orders_df.iterrows():
    c_date = datetime.strptime(order['created_date'], "%Y-%m-%d")
    p_date = datetime.strptime(order['promised_ship_date'], "%Y-%m-%d")
    
    start_idx = (c_date - START_DATE).days
    target_idx = (p_date - START_DATE).days
    
    # Calculate the average energy capacity during this order's production window
    window_days = daily_df[(daily_df['day_index'] >= start_idx) & (daily_df['day_index'] <= min(target_idx, 89))]
    avg_dyeing_cap = window_days['dyeing_capacity_factor'].mean()
    avg_sewing_cap = window_days['sewing_capacity_factor'].mean()
    avg_psi = window_days['gas_pressure_psi'].mean()
    
    # Overall bottleneck capacity: Dyeing throttles everything if gas-intensive
    if "HIGH" in order['gas_intensity'] or "EXTREME" in order['gas_intensity']:
        effective_cap = (avg_dyeing_cap * 0.6) + (avg_sewing_cap * 0.4)
    else:
        effective_cap = (avg_dyeing_cap * 0.3) + (avg_sewing_cap * 0.7)
        
    # Productivity factor incorporates real UCI baseline
    adjusted_productivity = BASE_PRODUCTIVITY * effective_cap
    
    # Required production days based on quantity & SMV vs available team hours
    standard_days_needed = (order['quantity'] * order['base_smv']) / (480 * 20 * BASE_PRODUCTIVITY) # 20 workers, 8hr/day
    actual_days_taken = standard_days_needed / effective_cap
    
    actual_completion_date = c_date + timedelta(days=int(actual_days_taken))
    days_late = max(0, (actual_completion_date - p_date).days)
    is_late = 1 if days_late > 0 else 0
    
    # Air freight cost gap ($7.00/kg air vs $0.35/kg sea = $6.65/kg penalty!)
    air_freight_penalty_usd = round(order['total_weight_kg'] * 6.65, 2) if is_late else 0.0
    buyer_delay_penalties = round(days_late * order['penalty_per_day_usd'], 2)
    total_exposure_usd = round(air_freight_penalty_usd + buyer_delay_penalties, 2)
    
    order_dict = order.to_dict()
    order_dict.update({
        "avg_window_psi": round(avg_psi, 2),
        "avg_dyeing_capacity": round(avg_dyeing_cap, 3),
        "actual_completion_date": actual_completion_date.strftime("%Y-%m-%d"),
        "days_late": days_late,
        "is_late": is_late,
        "air_freight_penalty_usd": air_freight_penalty_usd,
        "total_exposure_usd": total_exposure_usd
    })
    final_order_results.append(order_dict)

result_df = pd.DataFrame(final_order_results)

# 4. SAVE SIMULATED REALITY TO CSV FOR MODEL TRAINING
orders_path = DATA_DIR / "simulated_orders.csv"
daily_path = DATA_DIR / "daily_capacity.csv"

result_df.to_csv(orders_path, index=False)
daily_df.to_csv(daily_path, index=False)

late_count = result_df['is_late'].sum()
total_penalties = result_df['total_exposure_usd'].sum()

print("\n" + "="*60)
print("🎯 [SIMULATION SUMMARY — 60 EXPORT ORDERS]")
print("="*60)
print(f"📦 Total Orders Evaluated: {len(result_df)}")
print(f"🚨 Orders Killed by Gas Crisis (Late): {late_count} ({late_count/len(result_df)*100:.1f}%)")
print(f"💸 Total Export Penalty Exposure: ${total_penalties:,.2f} USD")
print(f"💾 Saved Orders dataset to: {orders_path}")
print(f"💾 Saved Daily Capacity dataset to: {daily_path}")
print("="*60)