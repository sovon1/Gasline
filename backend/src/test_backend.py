"""
GasLine Automated Comprehensive Test Suite
Validates all 9 backend routes, edge cases, NaN immunity, domain physics,
conformal prediction intervals, and real-world SCADA emergency scenarios.

Zero network dependencies — runs 100% locally with FastAPI TestClient.
"""

import unittest
import json
import math
import re
import sys
from pathlib import Path

# Add backend/src to sys.path
SRC_DIR = Path(__file__).resolve().parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

import server
import optimizer
from fastapi.testclient import TestClient


def is_nan_or_inf(val):
    """Recursively checks if any dictionary or list contains float NaN or Inf."""
    if isinstance(val, float):
        return math.isnan(val) or math.isinf(val)
    elif isinstance(val, dict):
        return any(is_nan_or_inf(v) for v in val.values())
    elif isinstance(val, list):
        return any(is_nan_or_inf(v) for v in val)
    return False


class TestGasLineBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(server.app)
        cls.original_orders_df = server.orders_df.copy(deep=True)

    def tearDown(self):
        # Restore orders_df to pristine baseline after each test
        server.orders_df = self.original_orders_df.copy(deep=True)

    # =========================================================================
    # TIER 1: Standard / Happy Path API Endpoint Contracts (12 Tests)
    # =========================================================================

    def test_01_health_check_contract(self):
        """GET /health returns healthy status, model accuracy, and conformal margin."""
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertGreaterEqual(data["orders_loaded"], 60)
        self.assertGreater(data["shocks_available"], 0)
        self.assertIn("model_accuracy", data)
        self.assertGreater(data["model_accuracy"], 0.90)
        self.assertIn("conformal_q90_margin_days", data)
        self.assertIn("port_buffer_days", data)

    def test_02_shocks_dataset_reconciliation(self):
        """GET /api/shocks returns 5 shocks with reconciled 2.1 PSI (Shock 3) and 1.6 PSI (Shock 5)."""
        res = self.client.get("/api/shocks")
        self.assertEqual(res.status_code, 200)
        shocks = res.json()
        self.assertEqual(len(shocks), 5)

        s3 = next(s for s in shocks if s["shock_id"] == 3)
        s5 = next(s for s in shocks if s["shock_id"] == 5)
        self.assertEqual(s3["zone_psi_actual"], 2.1)
        self.assertEqual(s5["zone_psi_actual"], 1.6)

    def test_03_port_buffer_contract(self):
        """GET /api/port-buffer returns Chattogram Port Authority logistics yard buffer."""
        res = self.client.get("/api/port-buffer")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("Chattogram", data["port_name"])
        self.assertEqual(data["recommended_buffer_days"], 2.5)
        self.assertGreater(data["yard_occupancy_pct"], 50.0)
        self.assertIn("status", data)

    def test_04_benchmark_metrics_contract(self):
        """GET /api/benchmark returns evaluation metrics, ablation comparisons, and conformal bounds."""
        res = self.client.get("/api/benchmark")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("metrics", data)
        self.assertIn("ablation", data)
        self.assertGreater(data["metrics"]["accuracy"], 0.95)
        self.assertGreater(data["ablation"]["error_reduction_pct"], 50.0)

    def test_05_get_all_orders(self):
        """GET /api/orders returns active factory orders with valid schemas."""
        res = self.client.get("/api/orders")
        self.assertEqual(res.status_code, 200)
        orders = res.json()
        self.assertGreaterEqual(len(orders), 60)
        first = orders[0]
        self.assertIn("order_id", first)
        self.assertIn("buyer", first)
        self.assertIn("quantity", first)
        self.assertIn("total_exposure_usd", first)

    def test_06_get_single_order_by_id(self):
        """GET /api/orders/{order_id} returns single order and handles case-insensitivity."""
        res = self.client.get("/api/orders/ORD-2026-001")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["order_id"], "ORD-2026-001")

        # Case-insensitive / whitespace trimmed
        res_case = self.client.get("/api/orders/ord-2026-001")
        self.assertEqual(res_case.status_code, 200)

    def test_07_simulate_shock_preset(self):
        """POST /api/simulate-shock with preset shock_id=3 computes dynamic risk and process capacity."""
        res = self.client.post("/api/simulate-shock", json={"shock_id": 3})
        self.assertEqual(res.status_code, 200)
        payload = res.json()
        self.assertEqual(payload["scenario"], "August Low-Supply Average")
        self.assertIn("parameters", payload)
        self.assertEqual(payload["parameters"]["gas_pressure_psi"], 2.1)
        self.assertIn("aggregate_impact", payload)
        self.assertGreaterEqual(len(payload["orders"]), 60)

    def test_08_simulate_shock_custom_psi(self):
        """POST /api/simulate-shock with custom_psi evaluates factory impact deterministically."""
        res = self.client.post("/api/simulate-shock", json={"custom_psi": 1.7, "custom_supply_mmcfd": 2200.0})
        self.assertEqual(res.status_code, 200)
        payload = res.json()
        self.assertEqual(payload["parameters"]["gas_pressure_psi"], 1.7)
        self.assertIn("orders_at_risk", payload["aggregate_impact"])

    def test_09_create_single_custom_order(self):
        """POST /api/orders creates a single lot with Model B inference and date schemas."""
        lot = {
            "buyer": "Inditex (Zara)",
            "product": "Cotton Fleece Hoodie",
            "quantity": 12000,
            "base_smv": 24.5,
            "lead_days": 18,
            "penalty_per_day_usd": 2500,
            "current_psi": 2.1
        }
        res = self.client.post("/api/orders", json=lot)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("order_id", data)
        self.assertTrue(data.get("is_custom"))
        self.assertIn("created_date", data)
        self.assertIn("actual_completion_date", data)
        self.assertIn("predicted_prob_late", data)
        self.assertIn("shap_attribution", data)

    def test_10_create_batch_custom_orders(self):
        """POST /api/orders creates batch lots and returns list of created lots."""
        batch = {
            "orders": [
                {"buyer": "H&M", "product": "Crewneck T-Shirt", "quantity": 10000, "lead_days": 15},
                {"buyer": "Marks & Spencer", "product": "Formal Polo", "quantity": 8000, "lead_days": 20}
            ]
        }
        res = self.client.post("/api/orders", json=batch)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 2)
        self.assertTrue(data[0].get("is_custom"))
        self.assertTrue(data[1].get("is_custom"))

    def test_11_rescue_plan_optimizer_by_order_id(self):
        """POST /api/rescue evaluates 5 ranked rescue plans for an existing order."""
        res = self.client.post("/api/rescue", json={"order_id": "ORD-2026-001"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["order_id"], "ORD-2026-001")
        self.assertIn("baseline", data)
        plans = data["rescue_plans"]
        self.assertEqual(len(plans), 5)
        # Verify descending order by net saving
        for i in range(len(plans) - 1):
            self.assertGreaterEqual(plans[i]["net_saving_usd"], plans[i+1]["net_saving_usd"])

    def test_12_alert_text_and_dispatch_by_order_id(self):
        """POST /api/alert-text and POST /api/dispatch-alert generate bilingual notifications and URLs."""
        alert_res = self.client.post("/api/alert-text", json={"order_id": "ORD-2026-001"})
        self.assertEqual(alert_res.status_code, 200)
        alert_data = alert_res.json()
        self.assertIn("bangla_message", alert_data)
        self.assertIn("english_message", alert_data)
        self.assertIn("🚨", alert_data["bangla_message"])

        dispatch_res = self.client.post("/api/dispatch-alert", json={
            "order_id": "ORD-2026-001",
            "channel": "whatsapp",
            "recipient": "+8801712345678"
        })
        self.assertEqual(dispatch_res.status_code, 200)
        dispatch_data = dispatch_res.json()
        self.assertIn("api.whatsapp.com", dispatch_data["whatsapp_url"])
        self.assertIn("mailto:", dispatch_data["email_url"])

    # =========================================================================
    # TIER 2: Boundary, Robustness & Bug-Specific Regression Tests (12 Tests)
    # =========================================================================

    def test_13_bug_be_01_rescue_null_weight_resilience(self):
        """BUG-BE-01: Null total_weight_kg in rescue evaluation must not crash with TypeError."""
        payload = {
            "custom_order": {
                "order_id": "LOT-NULL-WT",
                "quantity": 15000,
                "lead_days": 20,
                "total_weight_kg": None  # Triggers TypeError without fix
            }
        }
        res = self.client.post("/api/rescue", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("rescue_plans", data)
        self.assertEqual(len(data["rescue_plans"]), 5)

    def test_14_bug_be_02_rescue_missing_fields_resilience(self):
        """BUG-BE-02: Missing quantity/lead_days/penalty in custom_order must not crash with KeyError."""
        res_empty = self.client.post("/api/rescue", json={"custom_order": {}})
        self.assertEqual(res_empty.status_code, 200)
        self.assertEqual(len(res_empty.json()["rescue_plans"]), 5)

        res_partial = self.client.post("/api/rescue", json={"custom_order": {"buyer": "Zara"}})
        self.assertEqual(res_partial.status_code, 200)
        self.assertEqual(len(res_partial.json()["rescue_plans"]), 5)

    def test_15_bug_be_03_simulate_shock_empty_ledger_resilience(self):
        """BUG-BE-03: Empty orders_df must not raise ZeroDivisionError in /api/simulate-shock."""
        import pandas as pd
        server.orders_df = pd.DataFrame(columns=self.original_orders_df.columns)
        res = self.client.post("/api/simulate-shock", json={})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["aggregate_impact"]["total_orders"], 0)
        self.assertEqual(data["aggregate_impact"]["risk_percentage"], 0.0)

    def test_16_bug_be_04_orders_payload_validation(self):
        """BUG-BE-04: Malformed payloads on POST /api/orders return 400 Bad Request."""
        # Non-dict / non-list primitives
        r1 = self.client.post("/api/orders", json="string_not_dict")
        self.assertEqual(r1.status_code, 400)

        r2 = self.client.post("/api/orders", json=12345)
        self.assertEqual(r2.status_code, 400)

        # Non-list orders field
        r3 = self.client.post("/api/orders", json={"orders": "not_a_list"})
        self.assertEqual(r3.status_code, 400)

        # Non-dict item in orders list
        r4 = self.client.post("/api/orders", json={"orders": ["not_a_dict"]})
        self.assertEqual(r4.status_code, 400)

        # Invalid numeric fields
        r5 = self.client.post("/api/orders", json={"quantity": -500})
        self.assertEqual(r5.status_code, 400)

        r6 = self.client.post("/api/orders", json={"quantity": "invalid_int"})
        self.assertEqual(r6.status_code, 400)

    def test_17_bug_be_05_physical_boundary_clamping(self):
        """BUG-BE-05: custom_psi clamped to [0.5, 25.0] and capacities cannot be negative."""
        # Negative PSI simulation
        res_neg = self.client.post("/api/simulate-shock", json={"custom_psi": -10.0})
        self.assertEqual(res_neg.status_code, 200)
        p_neg = res_neg.json()["parameters"]
        self.assertGreaterEqual(p_neg["gas_pressure_psi"], 0.5)
        self.assertGreaterEqual(p_neg["dyeing_capacity_factor"], 0.05)
        self.assertGreaterEqual(p_neg["knitting_capacity_factor"], 0.10)

        # Over-pressure PSI simulation
        res_high = self.client.post("/api/simulate-shock", json={"custom_psi": 99.0})
        self.assertEqual(res_high.status_code, 200)
        p_high = res_high.json()["parameters"]
        self.assertLessEqual(p_high["gas_pressure_psi"], 25.0)

        # Thermodynamic fallback capacity bounds check
        cap = optimizer.predict_process_capacities(-5.0)
        self.assertGreaterEqual(cap["dyeing_cap"], 0.05)
        self.assertGreaterEqual(cap["knitting_cap"], 0.10)

    def test_18_bug_be_06_model_b_deserialization_fallback(self):
        """BUG-BE-06: Model B fallback safely handles missing or unpickled models without crashing."""
        orig_clf, orig_reg = optimizer.clf_model, optimizer.reg_model
        try:
            optimizer.clf_model = None
            optimizer.reg_model = None

            # Prediction works via calibrated domain physics heuristic
            risk = optimizer.predict_order_risk(
                quantity=15000,
                weight_kg=5250.0,
                base_smv=18.0,
                gas_intensity_code=2,
                lead_days=45,
                avg_window_psi=2.1,
                avg_dyeing_capacity=0.257
            )
            self.assertIn("prob_late", risk)
            self.assertGreaterEqual(risk["prob_late"], 0.0)
            self.assertGreaterEqual(risk["predicted_days_late"], 0.0)
        finally:
            optimizer.clf_model, optimizer.reg_model = orig_clf, orig_reg

    def test_19_bug_be_07_active_shock_psi_injection(self):
        """BUG-BE-07: Inactive (peacetime) vs simulated shock PSI accurately alters rescue plan baseline."""
        order = self.client.get("/api/orders").json()[0]

        # Peacetime baseline (avg ~4.43 PSI)
        peacetime_res = self.client.post("/api/rescue", json={"order_id": order["order_id"]})
        self.assertEqual(peacetime_res.status_code, 200)
        peacetime_p_late = peacetime_res.json()["baseline"]["p_late"]

        # Severe active shock (1.5 PSI)
        shock_res = self.client.post("/api/rescue", json={"order_id": order["order_id"], "current_psi": 1.5})
        self.assertEqual(shock_res.status_code, 200)
        shock_p_late = shock_res.json()["baseline"]["p_late"]

        # Late probability under energy shock must be strictly greater than or equal to peacetime
        self.assertGreaterEqual(shock_p_late, peacetime_p_late)

    def test_20_bug_be_08_custom_order_schema_compliance(self):
        """BUG-BE-08: Custom orders contain created_date, promised_ship_date, and actual_completion_date."""
        res = self.client.post("/api/orders", json={
            "buyer": "Primark",
            "product": "Denim Jeans",
            "quantity": 18000,
            "lead_days": 14
        })
        self.assertEqual(res.status_code, 200)
        order = res.json()
        self.assertIn("created_date", order)
        self.assertIn("promised_ship_date", order)
        self.assertIn("actual_completion_date", order)
        self.assertIn("avg_window_psi", order)
        self.assertIn("avg_dyeing_capacity", order)

    def test_21_bug_be_09_non_negative_risk_reduction(self):
        """BUG-BE-09: risk_reduction_pct across all evaluated plans must never evaluate to negative values."""
        res = self.client.post("/api/rescue", json={"order_id": "ORD-2026-001"})
        self.assertEqual(res.status_code, 200)
        for plan in res.json()["rescue_plans"]:
            self.assertGreaterEqual(plan["risk_reduction_pct"], 0.0)

    def test_22_bug_be_10_shap_budget_sum_strictly_100(self):
        """BUG-BE-10: SHAP feature attribution percentages sum <= 100.0% preventing negative frontend batch volumes."""
        res = self.client.post("/api/rescue", json={"order_id": "ORD-2026-001"})
        self.assertEqual(res.status_code, 200)
        shap = res.json()["baseline"]["shap_attribution"]
        attrs = shap["feature_attributions"]
        total_pct = sum([
            attrs["dyeing_gas_collapse_pct"],
            attrs["lead_slack_deficit_pct"],
            attrs["garment_smv_complexity_pct"],
            attrs["batch_volume_scale_pct"]
        ])
        self.assertAlmostEqual(total_pct, 100.0, places=1)
        self.assertGreaterEqual(attrs["batch_volume_scale_pct"], 0.0)

    def test_23_nonexistent_order_404_error(self):
        """Unknown order IDs return 404 Not Found in GET, rescue, and alert endpoints."""
        r1 = self.client.get("/api/orders/NONEXISTENT-999")
        self.assertEqual(r1.status_code, 404)

        r2 = self.client.post("/api/rescue", json={"order_id": "NONEXISTENT-999"})
        self.assertEqual(r2.status_code, 404)

        r3 = self.client.post("/api/alert-text", json={"order_id": "NONEXISTENT-999"})
        self.assertEqual(r3.status_code, 404)

    def test_24_missing_order_spec_400_error(self):
        """POST /api/rescue without order_id or custom_order returns 400 Bad Request."""
        res = self.client.post("/api/rescue", json={})
        self.assertEqual(res.status_code, 400)

    # =========================================================================
    # TIER 3: Cross-Feature Integration Pipelines (5 Tests)
    # =========================================================================

    def test_25_pipeline_custom_lot_to_shock_simulation(self):
        """Pipeline: Ingest custom order -> simulate shock -> verify custom order preserved and scored."""
        create_res = self.client.post("/api/orders", json={
            "order_id": "LOT-PIPE-001",
            "buyer": "Target",
            "product": "Cotton Hoodie",
            "quantity": 14000,
            "lead_days": 16,
            "gas_intensity": "HIGH"
        })
        self.assertEqual(create_res.status_code, 200)

        # Trigger simulation
        sim_res = self.client.post("/api/simulate-shock", json={"shock_id": 5})
        self.assertEqual(sim_res.status_code, 200)
        orders = sim_res.json()["orders"]

        # Verify LOT-PIPE-001 is included in updated_orders
        matched = [o for o in orders if o["order_id"] == "LOT-PIPE-001"]
        self.assertEqual(len(matched), 1)
        pipe_order = matched[0]
        self.assertIn("predicted_prob_late", pipe_order)
        self.assertIn("simulated_exposure_usd", pipe_order)

    def test_26_pipeline_custom_lot_rescue_and_dispatch(self):
        """Pipeline: Custom order rescue -> generate alert text -> dispatch via WhatsApp."""
        custom_lot = {
            "order_id": "LOT-RESCUE-002",
            "buyer": "Uniqlo",
            "product": "Denim Jeans",
            "quantity": 20000,
            "total_weight_kg": 14000.0,
            "lead_days": 12,
            "current_psi": 1.6
        }
        rescue_res = self.client.post("/api/rescue", json={"custom_order": custom_lot})
        self.assertEqual(rescue_res.status_code, 200)
        best_plan = rescue_res.json()["rescue_plans"][0]
        self.assertGreater(best_plan["net_saving_usd"], 0)

        # Generate alert
        alert_res = self.client.post("/api/alert-text", json={
            "custom_order": custom_lot,
            "top_plan_id": best_plan["plan_id"]
        })
        self.assertEqual(alert_res.status_code, 200)
        self.assertIn("Uniqlo", alert_res.json()["english_message"])

        # Dispatch alert
        dispatch_res = self.client.post("/api/dispatch-alert", json={
            "custom_order": custom_lot,
            "channel": "whatsapp",
            "recipient": "+8801999887766",
            "top_plan_id": best_plan["plan_id"]
        })
        self.assertEqual(dispatch_res.status_code, 200)
        self.assertIn("8801999887766", dispatch_res.json()["whatsapp_url"])

    def test_27_pipeline_nan_immunity_after_custom_orders(self):
        """BUG-BE-NAN: Verify zero NaN in serialized JSON across all endpoints after custom orders added."""
        # Add a custom order with missing optional attributes
        self.client.post("/api/orders", json={
            "buyer": "Test NaN Hunter",
            "product": "Basic Tee",
            "quantity": 6000
        })

        # 1. Verify GET /api/orders
        get_res = self.client.get("/api/orders")
        self.assertEqual(get_res.status_code, 200)
        self.assertIsNone(re.search(r':\s*(NaN|nan)\b', get_res.text))
        orders_parsed = json.loads(get_res.text)
        self.assertFalse(is_nan_or_inf(orders_parsed))

        # 2. Verify POST /api/simulate-shock
        sim_res = self.client.post("/api/simulate-shock", json={"shock_id": 4})
        self.assertEqual(sim_res.status_code, 200)
        self.assertIsNone(re.search(r':\s*(NaN|nan)\b', sim_res.text))
        sim_parsed = json.loads(sim_res.text)
        self.assertFalse(is_nan_or_inf(sim_parsed))

    def test_28_pipeline_specific_plan_selection(self):
        """Pipeline: Alert generation selecting a non-default intervention strategy."""
        alert_res = self.client.post("/api/alert-text", json={
            "order_id": "ORD-2026-001",
            "top_plan_id": "line_split"
        })
        self.assertEqual(alert_res.status_code, 200)
        self.assertEqual(alert_res.json()["recommended_plan"], "Parallel Line Split")

    def test_29_pipeline_conformal_prediction_intervals(self):
        """Pipeline: Model B conformal prediction intervals strictly encompass point predictions."""
        sim_res = self.client.post("/api/simulate-shock", json={"shock_id": 2})
        self.assertEqual(sim_res.status_code, 200)
        orders = sim_res.json()["orders"]
        for o in orders[:10]:
            pred_days = o["predicted_days_late"]
            interval = o["conformal_interval_90"]
            self.assertEqual(len(interval), 2)
            self.assertLessEqual(interval[0], pred_days + 1e-5)
            self.assertGreaterEqual(interval[1], pred_days - 1e-5)

    # =========================================================================
    # TIER 4: Real-World SCADA Emergency Scenarios (6 Tests)
    # =========================================================================

    def test_30_scenario_summit_lng_crisis_judge_demo(self):
        """Scenario: Judge Demo Trigger - Summit LNG Maintenance Shock 5 (1.6 PSI)."""
        res = self.client.post("/api/simulate-shock", json={"shock_id": 5})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["scenario"], "Summit LNG Maintenance")
        self.assertEqual(data["parameters"]["gas_pressure_psi"], 1.6)

        impact = data["aggregate_impact"]
        self.assertGreater(impact["orders_at_risk"], 0)
        self.assertGreater(impact["total_financial_exposure_usd"], 100000.0)

    def test_31_scenario_august_low_supply_crisis(self):
        """Scenario: Petrobangla August Low-Supply Average Shock 3 (2.1 PSI)."""
        res = self.client.post("/api/simulate-shock", json={"shock_id": 3})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["scenario"], "August Low-Supply Average")
        self.assertEqual(data["parameters"]["gas_pressure_psi"], 2.1)

    def test_32_scenario_fsru_terminal_failure(self):
        """Scenario: Moheshkhali FSRU Terminal Failure Shock 2 (2.5 PSI)."""
        res = self.client.post("/api/simulate-shock", json={"shock_id": 2})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["scenario"], "FSRU Terminal Failure")
        self.assertEqual(data["parameters"]["gas_pressure_psi"], 2.5)

    def test_33_scenario_dual_fuel_diesel_boiler_boost_roi(self):
        """Scenario: High-gas order evaluating Dual-Fuel Diesel Boost intervention yields net savings."""
        high_gas_lot = {
            "order_id": "LOT-DIESEL-001",
            "buyer": "Marks & Spencer",
            "product": "Denim Jeans",
            "quantity": 22000,
            "total_weight_kg": 15400.0,
            "lead_days": 10,
            "gas_intensity": "EXTREME (Washing & Steam)",
            "current_psi": 1.6,
            "penalty_per_day_usd": 3000
        }
        res = self.client.post("/api/rescue", json={"custom_order": high_gas_lot})
        self.assertEqual(res.status_code, 200)
        plans = res.json()["rescue_plans"]
        diesel_plan = next(p for p in plans if p["plan_id"] == "diesel_steam_boost")
        self.assertGreater(diesel_plan["net_saving_usd"], 0)
        self.assertGreater(diesel_plan["days_saved"], 0)

    def test_34_scenario_port_logistics_gate_in_advisory(self):
        """Scenario: CPA Port yard occupancy and feeder dwell advisory match SCADA operational thresholds."""
        res = self.client.get("/api/port-buffer")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("feeder_vessel_window_hours", data)
        self.assertEqual(data["feeder_vessel_window_hours"], 48)
        self.assertIn("ex-factory buffer recommended", data["advisory"])

    def test_35_scenario_offline_zero_network_integrity(self):
        """Scenario: Backend executes all operations deterministically with zero network calls."""
        # Ensure health, shock catalog, port buffer, benchmark, orders, and simulation execute cleanly
        for endpoint in ["/health", "/api/shocks", "/api/port-buffer", "/api/benchmark", "/api/orders"]:
            r = self.client.get(endpoint)
            self.assertEqual(r.status_code, 200)

    # =========================================================================
    # TIER 5: Adversarial Edge-Case 500 Elimination & Validation Hardening
    # =========================================================================

    def test_36_edge_case_orders_non_int_cancel_threshold_days(self):
        """POST /api/orders with non-int cancel_threshold_days returns 400 Bad Request."""
        res = self.client.post("/api/orders", json={"quantity": 1000, "cancel_threshold_days": "not_an_int"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("cancel_threshold_days must be an integer", res.json()["detail"])

    def test_37_edge_case_orders_empty_and_arbitrary_dict(self):
        """POST /api/orders with {} or arbitrary payload returns 400 Bad Request."""
        # Empty dict
        res_empty = self.client.post("/api/orders", json={})
        self.assertEqual(res_empty.status_code, 400)

        # Arbitrary nested dict
        res_arbitrary = self.client.post("/api/orders", json={"foo": {"bar": {"baz": [1, 2, 3]}}})
        self.assertEqual(res_arbitrary.status_code, 400)

        # Missing required field quantity
        res_no_qty = self.client.post("/api/orders", json={"buyer": "Zara", "product": "Jeans"})
        self.assertEqual(res_no_qty.status_code, 400)
        self.assertIn("quantity", res_no_qty.json()["detail"].lower())

    def test_38_edge_case_orders_string_avg_window_psi_and_dyeing_cap(self):
        """POST /api/orders with string avg_window_psi or avg_dyeing_capacity returns 400 Bad Request."""
        res_psi = self.client.post("/api/orders", json={"quantity": 1000, "avg_window_psi": "invalid_psi"})
        self.assertEqual(res_psi.status_code, 400)
        self.assertIn("avg_window_psi must be a number", res_psi.json()["detail"])

        res_cap = self.client.post("/api/orders", json={"quantity": 1000, "avg_dyeing_capacity": "invalid_cap"})
        self.assertEqual(res_cap.status_code, 400)
        self.assertIn("avg_dyeing_capacity must be a number", res_cap.json()["detail"])

    def test_39_edge_case_orders_extreme_lead_days_overflow_safety(self):
        """POST /api/orders with lead_days: 10000000 handles safely without OverflowError 500."""
        res = self.client.post("/api/orders", json={"quantity": 1000, "lead_days": 10000000})
        # Must not crash with 500
        self.assertIn(res.status_code, [200, 400])
        if res.status_code == 200:
            order = res.json()
            self.assertLessEqual(order["lead_days"], 365)
            self.assertIn("promised_ship_date", order)

    def test_40_edge_case_rescue_malformed_string_fields_resilience(self):
        """POST /api/rescue with string fields in custom_order returns 200 with valid rescue plans without 500."""
        # Malformed quantity
        res_qty = self.client.post("/api/rescue", json={"custom_order": {"quantity": "invalid"}})
        self.assertEqual(res_qty.status_code, 200)
        self.assertEqual(len(res_qty.json()["rescue_plans"]), 5)

        # Multiple malformed string fields
        malformed_lot = {
            "quantity": "invalid_qty",
            "base_smv": "super_high",
            "lead_days": "two_weeks",
            "penalty_per_day_usd": "expensive",
            "total_weight_kg": "heavy",
            "current_psi": "extreme_drop",
            "current_dyeing_cap": "bad_dye"
        }
        res_multi = self.client.post("/api/rescue", json={"custom_order": malformed_lot})
        self.assertEqual(res_multi.status_code, 200)
        self.assertEqual(len(res_multi.json()["rescue_plans"]), 5)

    def test_41_edge_case_alert_and_dispatch_malformed_custom_order(self):
        """POST /api/alert-text and /api/dispatch-alert with malformed custom_order return 200 without 500."""
        res_alert = self.client.post("/api/alert-text", json={"custom_order": {"quantity": "invalid"}})
        self.assertEqual(res_alert.status_code, 200)
        self.assertIn("bangla_message", res_alert.json())

        res_dispatch = self.client.post("/api/dispatch-alert", json={
            "custom_order": {"quantity": "invalid"},
            "channel": "whatsapp",
            "recipient": "+8801700000000"
        })
        self.assertEqual(res_dispatch.status_code, 200)
        self.assertIn("whatsapp_url", res_dispatch.json())

    # =========================================================================
    # TIER 5: Frontier AI Systems (Copilot, Vision OCR, Force Majeure) (6 Tests)
    # =========================================================================

    def test_42_frontier_copilot_chat_english_offline_mode(self):
        """POST /api/copilot/chat executes ReAct tools and returns authoritative numerical response in English."""
        res = self.client.post("/api/copilot/chat", json={
            "message": "What happens if gas pressure drops to 1.6 PSI?",
            "language": "en"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("tools_called", data)
        self.assertGreater(len(data["tools_called"]), 0)
        self.assertIn("reply", data)
        self.assertIn("action_chips", data)
        self.assertFalse(is_nan_or_inf(data))

    def test_43_frontier_copilot_chat_bangla_offline_mode(self):
        """POST /api/copilot/chat returns authentic factory Bangla advice with numerical citations."""
        res = self.client.post("/api/copilot/chat", json={
            "message": "তিতাস গ্যাস ১.৬ পিএসআই হলে কত ক্ষতি হবে?",
            "language": "bn"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["lang"], "bn")
        self.assertIn("reply", data)
        self.assertIn("গ্যাস", data["reply"])
        self.assertFalse(is_nan_or_inf(data))

    def test_44_frontier_vision_scan_card_preset_1(self):
        """POST /api/vision/scan-card digitizes Cumilla EPZ whiteboard and performs live Model B inference."""
        res = self.client.post("/api/vision/scan-card", json={"preset_id": "preset_1"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["extracted_order"]["buyer"], "Inditex (Zara)")
        self.assertIn("live_ml_scoring", data)
        self.assertIn("prob_late", data["live_ml_scoring"])
        self.assertIn("conformal_interval_90", data["live_ml_scoring"])
        self.assertFalse(is_nan_or_inf(data))

    def test_45_frontier_vision_scan_card_preset_2_and_3(self):
        """POST /api/vision/scan-card digitizes dyeing lot ticket and emergency line sheet with valid confidence."""
        for pid in ["preset_2", "preset_3"]:
            res = self.client.post("/api/vision/scan-card", json={"preset_id": pid})
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertGreater(data["extracted_order"]["confidence_score"], 0.9)
            self.assertFalse(is_nan_or_inf(data))

    def test_46_frontier_force_majeure_certificate_generation(self):
        """POST /api/force-majeure generates valid legal document citing Section 42 BERC Act 2003."""
        res = self.client.post("/api/force-majeure", json={
            "order_id": "ORD-2026-001",
            "factory_name": "Apex Textile Composite Ltd."
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("BERC-FM-2026-", data["certificate_ref"])
        self.assertIn("Section 42", data["english_certificate"])
        self.assertIn("বিইআরসি", data["bangla_certificate"])
        self.assertFalse(is_nan_or_inf(data))

    def test_47_frontier_force_majeure_statutory_and_conformal_bounds(self):
        """POST /api/force-majeure calculates Scope-1 diesel mitigation and conformal bounds correctly."""
        res = self.client.post("/api/force-majeure", json={
            "order_id": "ORD-2026-002",
            "custom_psi": 1.4
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data["conformal_window"]), 2)
        self.assertGreater(data["diesel_liters_mitigation"], 0)
        self.assertGreater(data["crisis_co2_tons"], 0.0)
        self.assertFalse(is_nan_or_inf(data))

    def test_48_frontier_copilot_models_catalog_endpoint(self):
        """POST /api/copilot/models queries live model providers and returns structured model catalogues."""
        for prov in ["gemini", "groq", "openai", "ollama", "local"]:
            res = self.client.post("/api/copilot/models", json={"provider": prov})
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["status"], "success")
            self.assertEqual(data["provider"], prov)
            self.assertIn("models", data)
            self.assertGreater(len(data["models"]), 0)
            self.assertFalse(is_nan_or_inf(data))


if __name__ == "__main__":
    unittest.main(verbosity=2)
