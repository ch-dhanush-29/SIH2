import time
import os
import sys
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.app.services.anomaly_detector import DynamicAnomalyDetector
from backend.app.services.drift_predictor import DriftPredictor
from backend.app.services.risk_engine import ScreeningRiskEngine

def benchmark_scale(n_components: int):
    print(f"\n--- Benchmarking BurnWatch AI Screening Engine on {n_components:,} Components ---")
    rng = np.random.RandomState(42)

    # Synthetic population generation
    v_0h = rng.normal(10.0, 0.4, n_components)
    slopes = rng.normal(0.008, 0.003, n_components)
    # Inject 5% latent defects
    n_defects = int(0.05 * n_components)
    slopes[:n_defects] = rng.uniform(0.040, 0.080, n_defects)
    v_24h = v_0h + slopes * 24.0

    static_limit = 50.0
    sensitivity = 0.85

    start_time = time.perf_counter()

    # Step 1: Dynamic Limits
    lot_stats = DynamicAnomalyDetector.compute_dynamic_limits(v_24h, static_limit, sensitivity)
    
    # Step 2: Safety Slope
    slope_stats = DriftPredictor.calculate_lot_safety_slope(slopes, sensitivity)
    safety_slope = slope_stats["safety_slope"]

    # Step 3: Vectorized Feature Construction & Fast Scoring
    # Compute robust Z vector
    z_scores = (v_24h - lot_stats["median"]) / lot_stats["robust_sigma"]
    drift_slopes = (v_24h - v_0h) / 24.0

    # Vectorized check
    slope_exceeded = drift_slopes > safety_slope
    predicted_168h = v_24h + drift_slopes * 144.0 * np.where(slope_exceeded, 1.25, 0.95)
    early_reject = slope_exceeded | (predicted_168h > lot_stats["dynamic_limit"])

    # High-recall Risk Matrix
    pass_cnt = int(np.sum(~early_reject & (z_scores < 3.0)))
    rev_cnt = int(np.sum(~early_reject & (z_scores >= 3.0)))
    rej_cnt = int(np.sum(early_reject))

    # Evaluate escape rate on injected defects
    escaped_defects = int(np.sum(~early_reject[:n_defects]))

    elapsed = time.perf_counter() - start_time
    throughput = n_components / max(elapsed, 1e-6)

    print(f"Total Time: {elapsed*1000:.2f} ms ({elapsed:.4f} s)")
    print(f"Throughput: {throughput:,.0f} components/sec")
    print(f"Screening Yield: {pass_cnt:,} PASS ({pass_cnt/n_components*100:.1f}%), {rev_cnt:,} REVIEW, {rej_cnt:,} REJECT")
    print(f"Escaped Defects: {escaped_defects} (False Negatives on {n_defects:,} defect parts)")
    print(f"Early Reject Savings: {rej_cnt * 144:,} chamber hours")

    return {
        "n_components": n_components,
        "elapsed_ms": round(elapsed * 1000, 2),
        "throughput_comps_per_sec": round(throughput, 0),
        "escaped_defects": escaped_defects,
        "reject_count": rej_cnt
    }

def main():
    print("=" * 65)
    print("      BURWATCH 3D — HIGH-SCALE SCREENING BENCHMARK SUITE")
    print("=" * 65)

    results = []
    for count in [1_000, 10_000, 100_000]:
        res = benchmark_scale(count)
        results.append(res)

    print("\n" + "=" * 65)
    print("                  BENCHMARK SUMMARY TABLE")
    print("=" * 65)
    print(f"{'Scale (Components)':<20} | {'Latency (ms)':<15} | {'Throughput (c/s)':<18} | {'Escaped (FN)':<12}")
    print("-" * 72)
    for r in results:
        print(f"{r['n_components']:<20,d} | {r['elapsed_ms']:<15.2f} | {r['throughput_comps_per_sec']:<18,.0f} | {r['escaped_defects']:<12d}")
    print("=" * 65)

if __name__ == "__main__":
    main()
