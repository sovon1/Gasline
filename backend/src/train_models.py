import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, accuracy_score, precision_score, recall_score, mean_absolute_error
import joblib

# Paths setup
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

print("🚀 [Training] Loading simulation data...")
df_daily = pd.read_csv(DATA_DIR / "daily_capacity.csv")
df_orders = pd.read_csv(DATA_DIR / "simulated_orders.csv")

# ==========================================
# 1. MODEL A: PROCESS CAPACITY FORECASTER
# ==========================================
print("\n--- Training Model A: Process Capacity Forecaster ---")
df_daily["rolling_psi_3d"] = df_daily["gas_pressure_psi"].rolling(window=3, min_periods=1).mean()
df_daily["psi_lag1"] = df_daily["gas_pressure_psi"].shift(1).fillna(df_daily["gas_pressure_psi"].iloc[0])
df_daily["is_outage_zone"] = (df_daily["gas_pressure_psi"] < 4.0).astype(int)

features_a = ["gas_pressure_psi", "national_supply_mmcfd", "rolling_psi_3d", "psi_lag1", "is_outage_zone"]
X_a = df_daily[features_a]

processes = ["dyeing_capacity_factor", "knitting_capacity_factor", "sewing_capacity_factor"]
models_a = {}

for proc in processes:
    y_a = df_daily[proc].to_numpy(dtype=np.float64)
    model = HistGradientBoostingRegressor(random_state=42, max_iter=150, max_leaf_nodes=20, learning_rate=0.08)
    model.fit(X_a.to_numpy(dtype=np.float64), y_a)
    y_pred = model.predict(X_a.to_numpy(dtype=np.float64))
    mae = mean_absolute_error(y_a, y_pred)
    print(f"✅ Model A [{proc}] Fitted - Train MAE: {mae:.4f}")
    models_a[proc] = model

joblib.dump({"models": models_a, "features": features_a}, MODELS_DIR / "model_a_capacity.pkl")
print("💾 Saved Model A to backend/models/model_a_capacity.pkl")

# ==========================================
# 2. MODEL B: ORDER LATE RISK & MULTI-QUANTILE CONFORMAL ENGINE
# ==========================================
print("\n--- Training Model B: Full Quotation-Horizon & Conformal Engine ---")

np.random.seed(42)
N_SYNTH = 6000

synth_orders = []
gas_intensity_map = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "EXTREME": 3}

for _ in range(N_SYNTH):
    qty = np.random.randint(2500, 36000)
    base_smv = np.random.choice([10.5, 12.0, 15.0, 18.0, 22.0, 24.5, 28.0])
    gas_int = np.random.choice(["LOW", "MEDIUM", "HIGH", "EXTREME"], p=[0.10, 0.25, 0.40, 0.25])
    gas_int_code = gas_intensity_map[gas_int]
    # Span full merchandiser quotation window from 10-day rush orders to 105-day seasonal bookings
    lead_days = np.random.randint(10, 105)
    avg_psi = np.random.uniform(1.0, 14.0)

    # Process physics response anchored to BKMEA survey loss curves
    if avg_psi < 4.0:
        dyeing_cap = max(0.08, 0.49 * (avg_psi / 4.0))
        sewing_cap = 0.60
    elif avg_psi < 8.0:
        dyeing_cap = 0.70 + (avg_psi - 4.0) * 0.05
        sewing_cap = 0.82
    else:
        dyeing_cap = 0.95
        sewing_cap = 0.95

    if gas_int_code >= 2:
        effective_cap = (dyeing_cap * 0.6) + (sewing_cap * 0.4)
    elif gas_int_code == 1:
        effective_cap = (dyeing_cap * 0.3) + (sewing_cap * 0.7)
    else:
        effective_cap = (dyeing_cap * 0.15) + (sewing_cap * 0.85)

    # Calibrated UCI line productivity dispersion (mean 0.735, ~3% line variance)
    line_jitter = float(np.clip(np.random.normal(1.0, 0.03), 0.90, 1.10))
    workload_minutes = qty * base_smv
    std_days = workload_minutes / 7056.0
    actual_days = std_days / max(0.12, effective_cap * line_jitter)
    days_late = max(0.0, round(actual_days - lead_days, 1))
    is_late = 1 if days_late > 0.4 else 0
    unit_w = 0.20 if base_smv <= 12.0 else (0.30 if base_smv <= 18.0 else (0.55 if base_smv <= 24.5 else 0.68))
    weight_kg = round(qty * unit_w, 1)

    workload_ratio = std_days / lead_days
    lead_slack = lead_days - std_days

    synth_orders.append({
        "quantity": qty,
        "weight_kg": weight_kg,
        "base_smv": base_smv,
        "gas_intensity_code": gas_int_code,
        "lead_days": lead_days,
        "avg_window_psi": round(avg_psi, 2),
        "avg_dyeing_capacity": round(dyeing_cap, 3),
        "workload_minutes": workload_minutes,
        "standard_days": round(std_days, 1),
        "workload_ratio": round(workload_ratio, 3),
        "lead_slack": round(lead_slack, 1),
        "days_late": days_late,
        "is_late": is_late
    })

df_synth = pd.DataFrame(synth_orders)

features_b = [
    "quantity", "weight_kg", "base_smv", "gas_intensity_code",
    "lead_days", "avg_window_psi", "avg_dyeing_capacity",
    "workload_minutes", "standard_days", "workload_ratio", "lead_slack"
]

X_b = df_synth[features_b]
y_b_class = df_synth["is_late"]
y_b_reg = df_synth["days_late"]

# Train/Calibration/Test split (70% Train, 15% Calib, 15% Test)
X_train, X_temp, y_tr_c, y_temp_c = train_test_split(X_b, y_b_class, test_size=0.30, random_state=42)
y_tr_r, y_temp_r = y_b_reg.loc[X_train.index], y_b_reg.loc[X_temp.index]

X_calib, X_test, y_cal_c, y_test_c = train_test_split(X_temp, y_temp_c, test_size=0.50, random_state=42)
y_cal_r, y_test_r = y_temp_r.loc[X_calib.index], y_temp_r.loc[X_test.index]

# 2.1 Classifier: P(Late)
clf = HistGradientBoostingClassifier(
    random_state=42,
    max_iter=280,
    max_leaf_nodes=31,
    learning_rate=0.08,
    min_samples_leaf=15
)
clf.fit(X_train.to_numpy(dtype=np.float64), y_tr_c.to_numpy())
y_pred_prob = clf.predict_proba(X_test.to_numpy(dtype=np.float64))[:, 1]
y_pred_c = clf.predict(X_test.to_numpy(dtype=np.float64))

auc = roc_auc_score(y_test_c, y_pred_prob)
acc = accuracy_score(y_test_c, y_pred_c)
prec = precision_score(y_test_c, y_pred_c)
rec = recall_score(y_test_c, y_pred_c)

print("📊 Model B (Classifier) Test Metrics:")
print(f"   ROC-AUC:   {auc:.4f}")
print(f"   Accuracy:  {acc*100:.2f}%")
print(f"   Precision: {prec*100:.2f}%")
print(f"   Recall:    {rec*100:.2f}%")

# 2.2 Regressor: Days Late
reg = HistGradientBoostingRegressor(
    random_state=42,
    max_iter=280,
    max_leaf_nodes=31,
    learning_rate=0.08,
    min_samples_leaf=15
)
reg.fit(X_train.to_numpy(dtype=np.float64), y_tr_r.to_numpy(dtype=np.float64))
y_pred_r = reg.predict(X_test.to_numpy(dtype=np.float64))
mae_reg = mean_absolute_error(y_test_r, y_pred_r)
print(f"📊 Model B (Regressor) Test MAE: {mae_reg:.2f} days")

# 2.3 Split-Conformal Prediction Quantiles across Quotation Tiers (85%, 90%, 95%, 97%)
calib_preds = np.maximum(0.0, reg.predict(X_calib.to_numpy(dtype=np.float64)))
residuals = np.abs(y_cal_r - calib_preds)
q_85 = float(np.quantile(residuals, 0.85))
q_90 = float(np.quantile(residuals, 0.90))
q_95 = float(np.quantile(residuals, 0.95))
q_97 = float(np.quantile(residuals, 0.97))
print(
    f"🛡️ Split-Conformal Margins: "
    f"85%=±{q_85:.2f}d | 90%=±{q_90:.2f}d | 95%=±{q_95:.2f}d | 97%=±{q_97:.2f}d"
)

# Persist Model B artifacts
joblib.dump(clf, MODELS_DIR / "model_b_classifier.pkl")
joblib.dump(reg, MODELS_DIR / "model_b_regressor.pkl")

metadata = {
    "features": features_b,
    "conformal_q85": round(q_85, 2),
    "conformal_q90": round(q_90, 2),
    "conformal_q95": round(q_95, 2),
    "conformal_q97": round(q_97, 2),
    "training_samples": int(len(X_train)),
    "calibration_samples": int(len(X_calib)),
    "test_samples": int(len(X_test)),
    "metrics": {
        "auc": round(auc, 4),
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "days_late_mae": round(mae_reg, 2)
    }
}

with open(MODELS_DIR / "model_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print("💾 Saved multi-quantile Model B artifacts to backend/models/")
print("=" * 60)
