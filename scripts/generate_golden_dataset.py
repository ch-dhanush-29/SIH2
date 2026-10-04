import os
import csv
import numpy as np

def generate_golden_dataset(output_path: str = "data/golden_dataset_1000.csv", seed: int = 42):
    """
    Generates a deterministic 1,000-component golden dataset across 10 lots
    for SIH 2026 Problem Statement SIH26170.
    
    Includes the Star Demo Component:
      part_id: CHIP-LOT04-042
      v_0h: 10.2 µA
      v_24h: 11.1 µA
      v_96h: 14.8 µA
      v_168h: 28.5 µA
      Static Limit: 50.0 µA
    Passes static test, but BurnWatch AI flags early reject at 24h!
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    rng = np.random.RandomState(seed)

    lots = [f"LOT-2026-{i:02d}" for i in range(1, 11)]
    records = []

    for lot_idx, lot_id in enumerate(lots):
        n_parts = 100
        lot_baseline_mean = 10.0 + (lot_idx * 0.25)
        lot_baseline_sigma = 0.35

        for p_idx in range(n_parts):
            part_id = f"CHIP-{lot_id[-5:]}-{p_idx+1:03d}"
            row = p_idx // 10
            col = p_idx % 10

            # Special case: The Star Demo Component on Lot 4 (index 3)
            if lot_id == "LOT-2026-04" and p_idx == 41:
                part_id = "CHIP-LOT04-042"
                records.append({
                    "part_id": part_id,
                    "lot_id": lot_id,
                    "param": "iddq",
                    "row": row,
                    "col": col,
                    "v_0h": 10.20,
                    "v_24h": 11.10,
                    "v_96h": 14.80,
                    "v_168h": 28.50,
                    "ground_truth": "LATENT_DRIFT",
                    "is_defect": True
                })
                continue

            # 4% Hard Fail (fails static limit from start)
            if p_idx < 4:
                v_0 = round(rng.uniform(52.0, 75.0), 2)
                v_24 = round(v_0 + rng.uniform(2.0, 8.0), 2)
                v_96 = round(v_24 + rng.uniform(4.0, 15.0), 2)
                v_168 = round(v_96 + rng.uniform(5.0, 20.0), 2)
                records.append({
                    "part_id": part_id,
                    "lot_id": lot_id,
                    "param": "iddq",
                    "row": row,
                    "col": col,
                    "v_0h": v_0,
                    "v_24h": v_24,
                    "v_96h": v_96,
                    "v_168h": v_168,
                    "ground_truth": "HARD_FAIL",
                    "is_defect": True
                })
            # 6% Latent Defect (normal initial value, abnormal acceleration)
            elif p_idx < 10:
                v_0 = round(rng.normal(lot_baseline_mean, lot_baseline_sigma), 2)
                slope = rng.uniform(0.045, 0.095) # High drift slope
                v_24 = round(v_0 + slope * 24.0, 2)
                v_96 = round(v_24 + slope * 72.0 * 1.3, 2) # accelerating
                v_168 = round(v_96 + slope * 72.0 * 1.6, 2)
                records.append({
                    "part_id": part_id,
                    "lot_id": lot_id,
                    "param": "iddq",
                    "row": row,
                    "col": col,
                    "v_0h": v_0,
                    "v_24h": v_24,
                    "v_96h": v_96,
                    "v_168h": v_168,
                    "ground_truth": "LATENT_DRIFT",
                    "is_defect": True
                })
            # 90% Normal parts
            else:
                v_0 = round(rng.normal(lot_baseline_mean, lot_baseline_sigma), 2)
                slope = rng.uniform(0.002, 0.012) # Nominal slow drift
                v_24 = round(v_0 + slope * 24.0 + rng.normal(0, 0.05), 2)
                v_96 = round(v_24 + slope * 72.0 * 0.95 + rng.normal(0, 0.08), 2)
                v_168 = round(v_96 + slope * 72.0 * 0.90 + rng.normal(0, 0.10), 2)
                records.append({
                    "part_id": part_id,
                    "lot_id": lot_id,
                    "param": "iddq",
                    "row": row,
                    "col": col,
                    "v_0h": max(0.1, v_0),
                    "v_24h": max(0.1, v_24),
                    "v_96h": max(0.1, v_96),
                    "v_168h": max(0.1, v_168),
                    "ground_truth": "NORMAL",
                    "is_defect": False
                })

    # Write to CSV
    fieldnames = ["part_id", "lot_id", "param", "row", "col", "v_0h", "v_24h", "v_96h", "v_168h", "ground_truth", "is_defect"]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"Generated {len(records)} golden records in {output_path}")

if __name__ == "__main__":
    generate_golden_dataset()
