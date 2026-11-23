import sys
from pathlib import Path

# Add current dir to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

print("🔍 Testing GasLine backend imports and initialization...")
try:
    from optimizer import predict_order_risk, evaluate_rescue_plans, predict_process_capacities
    print("✅ optimizer.py imported successfully")

    cap = predict_process_capacities(2.1, 2235.0)
    print(f"✅ Process Capacity Prediction: {cap}")

    risk = predict_order_risk(15000, 5250.0, 18.0, 2, 45, 2.1, 0.257)
    print(f"✅ Order Risk Prediction: {risk}")

    from server import app
    print("✅ server.py FastAPI app initialized successfully")
    print("🎉 All backend components verified ready for competition!")
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
