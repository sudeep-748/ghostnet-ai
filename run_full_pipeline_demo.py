"""
GhostNet AI - Full End-to-End Pipeline Demo (Member 1 + Member 2)
Executes:
1. Member 1: Live Open-Meteo Ingestion & 5,000-Particle Lagrangian Simulation
2. Member 2: Coastal Spatial Risk Scoring (Olive Ridley Turtles & Navigation Lanes)
3. Member 2: Offline Mission Package Bundling for Recovery Boats
"""

import json
import os
import sys

# Ensure root in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from backend.app.services.drift_engine import LagrangianDriftEngine
from backend.app.services.risk_scoring import SpatialRiskScorer
from backend.app.services.package_bundler import MissionPackageBundler


def main():
    print("=" * 80)
    print("🌊 GHOSTNET AI — COMPLETE END-TO-END PIPELINE (MEMBER 1 + MEMBER 2)")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # STAGE 1: MEMBER 1 (Drift Simulation)
    # -------------------------------------------------------------------------
    print("\n[STAGE 1/3] Running Member 1 (Physics & Ocean Simulation)...")
    origin_lat = 13.1250
    origin_lon = 80.3800
    gear = "gillnet"

    drift_engine = LagrangianDriftEngine()
    drift_result = drift_engine.run_simulation(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        gear_type=gear,
        forecast_hours=72,
        num_particles=5000,
    )

    print(f"  ✅ Simulation Complete:")
    print(f"     • Confidence:        {drift_result.confidence_score * 100:.1f}%")
    print(f"     • Drift Distance:    {drift_result.total_distance_nm} Nautical Miles")
    print(f"     • Drift Bearing:     {drift_result.mean_bearing_deg}° Heading")
    print(f"     • Heatmap Polygons:  {len(drift_result.drift_heatmap_geojson['features'])} cells")

    # -------------------------------------------------------------------------
    # STAGE 2: MEMBER 2 (Spatial Risk Scorer)
    # -------------------------------------------------------------------------
    print("\n[STAGE 2/3] Running Member 2 (Spatial Risk Scorer)...")
    risk_scorer = SpatialRiskScorer()
    risk_result = risk_scorer.evaluate_risk(
        heatmap_geojson=drift_result.drift_heatmap_geojson,
        predicted_path_geojson=drift_result.predicted_path_geojson,
    )

    print(f"  ✅ Spatial Risk Assessment Complete:")
    print(f"     • Composite Risk Score:  {risk_result.composite_risk_score} / 100")
    print(f"     • Risk Classification:   🚨 {risk_result.risk_classification}")
    print(f"     • Recommended Action:    {risk_result.recommended_action}")
    print(f"     • Component Breakdown:   Density={risk_result.density_component_score}, Eco={risk_result.ecological_component_score}, Fishing={risk_result.fishing_component_score}, Nav={risk_result.navigation_component_score}")
    
    if risk_result.matched_zones:
        print(f"     • Threatened Coastal Habitats / Corridors:")
        for z in risk_result.matched_zones:
            print(f"       - [{z['type'].upper()}] {z['name']} (Threat Level: {z['severity']})")

    # -------------------------------------------------------------------------
    # STAGE 3: MEMBER 2 (Offline Mission Packager)
    # -------------------------------------------------------------------------
    print("\n[STAGE 3/3] Compiling Offline Mission Package for Recovery Vessels...")
    bundler = MissionPackageBundler()
    package = bundler.build_package(
        report_id="rpt_kasimedu_2026_001",
        drift_result=drift_result,
        risk_result=risk_result,
    )

    output_pkg_path = os.path.join(current_dir, "offline_mission_package.json")
    with open(output_pkg_path, "w", encoding="utf-8") as f:
        f.write(package.to_json())

    print(f"  ✅ Offline Mission Package Created:")
    print(f"     • Mission ID:             {package.mission_id}")
    print(f"     • Offline Bounding Box:   {package.offline_map_bbox}")
    print(f"     • Estimated Patrol Hours: {package.estimated_patrol_hours} hrs ({package.patrol_distance_nm} NM sweep)")
    print(f"     • Saved Offline File:     {output_pkg_path}")

    print("\n" + "=" * 80)
    print("🎉 FULL BACKEND ENGINE COMPLETE: Member 1 and Member 2 are fully integrated!")
    print("=" * 80)


if __name__ == "__main__":
    main()
