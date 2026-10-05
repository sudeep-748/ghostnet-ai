"""
GhostNet AI - Member 1 Runnable Demo Script
Run this script directly in PyCharm to execute the full 5,000-particle Lagrangian simulation!
"""

import os
import sys

# Ensure backend package is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from backend.app.services.drift_engine import LagrangianDriftEngine


def main():
    print("=" * 75)
    print("🌊 GHOSTNET AI — MEMBER 1: LAGRANGIAN DRIFT PREDICTION ENGINE")
    print("=" * 75)

    # 1. Initialize Engine
    engine = LagrangianDriftEngine()

    # 2. Define Lost Net Incident (Kasimedu Fishing Harbour, Chennai)
    incident_lat = 13.1250
    incident_lon = 80.2970
    net_material = "gillnet"

    print(f"\n[1/3] Ingesting Fisher Loss Report:")
    print(f"      • Reported GPS Coordinates: Lat {incident_lat}°N, Lon {incident_lon}°E")
    print(f"      • Location:                  Kasimedu Coast, Bay of Bengal")
    print(f"      • Lost Gear Type:            {net_material.upper()}")

    print(f"\n[2/3] Simulating 5,000-Particle Lagrangian Trajectory over 72 Hours...")
    print(f"      • Ocean Current Advection:  Active (Open-Meteo)")
    print(f"      • Gear Buoyancy Leeway:     Active (alpha = 0.0125)")
    print(f"      • Stokes Wave Drift:        Active (beta = 0.015)")
    print(f"      • Brownian Diffusion:       Active (Kh = 1.0 m^2/s)")

    result = engine.run_simulation(
        origin_lat=incident_lat,
        origin_lon=incident_lon,
        gear_type=net_material,
        forecast_hours=72,
        num_particles=5000,
    )

    print(f"\n[3/3] Simulation Complete! Output Bundle Generated:")
    print("-" * 75)
    print(f"  📊 Model Confidence Score:     {result.confidence_score * 100:.1f}%")
    print(f"  📏 Total Drift Distance:       {result.total_distance_nm} Nautical Miles")
    print(f"  🧭 Compass Heading (Bearing):  {result.mean_bearing_deg}° (North-East)")
    print(f"  🎯 Predicted T+72h Location:   Lat {result.predicted_final_coordinate['latitude']}°N, Lon {result.predicted_final_coordinate['longitude']}°E")
    print(f"  🌊 Live Ocean Current Speed:   {result.weather_snapshot['current_velocity_knots']} knots")
    print(f"  💨 Surface Wind Speed:         {result.weather_snapshot['wind_speed_knots']} knots")
    print(f"  🌊 Significant Wave Height:    {result.weather_snapshot['wave_height_m']} meters")
    print(f"  🗺️  GeoJSON Heatmap Polygons:   {len(result.drift_heatmap_geojson['features'])} density cells created")
    print(f"  📈 Trajectory LineString:       {len(result.predicted_path_geojson['features'])} waypoints created")
    print("=" * 75)
    print("🎉 Output bundle is ready for Member 2 (Risk Scorer) and Member 4 (Map UI)!")


if __name__ == "__main__":
    main()
