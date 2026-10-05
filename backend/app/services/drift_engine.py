"""
GhostNet AI - Lagrangian Particle Drift Simulation Engine
Module: backend.app.services.drift_engine

Implements an ensemble Monte Carlo Lagrangian particle tracking model (N = 5,000 particles)
to forecast the spatio-temporal trajectory of Abandoned, Lost, or Discarded Fishing Gear (ALDFG)
across 24h, 48h, and 72h horizons off the Chennai coast (Bay of Bengal).

Integrates:
- Surface ocean current advection (u_current, v_current)
- Gear-specific buoyancy windage leeway (alpha * u_wind)
- Stokes surface wave momentum drift (beta * u_wave)
- Turbulent stochastic Brownian diffusion (eta ~ N(0, sqrt(2 * Kh * dt)))
- Geospatial probability density gridding (0.002 deg resolution)
- GeoJSON Polygon heatmap and LineString trajectory serialization
"""

from __future__ import annotations

import json
import logging
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

# Optional GeoPandas / Shapely integration with standard python GeoJSON fallback
try:
    import geopandas as gpd
    from shapely.geometry import Point, Polygon, box, mapping
    HAS_GEOPANDAS = True
except ImportError:
    HAS_GEOPANDAS = False

try:
    from .marine_meteo import HourlyMeteoConditions, MarineMeteoService, MarineSnapshot
except (ImportError, ValueError):
    from marine_meteo import HourlyMeteoConditions, MarineMeteoService, MarineSnapshot

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------------------
# Physical Constants & Gear Calibration
# ------------------------------------------------------------------------------
EARTH_RADIUS_METERS = 6371000.0
METERS_PER_NAUTICAL_MILE = 1852.0

# Gear buoyancy windage leeway factors (alpha)
GEAR_WINDAGE_FACTORS: Dict[str, float] = {
    "surface_buoys": 0.040,      # High surface exposure (0.035 - 0.045)
    "buoy": 0.040,
    "gillnet": 0.0125,          # Suspended subsurface drag (0.010 - 0.015)
    "monofilament_net": 0.0125,
    "multifilament_net": 0.0110,
    "trawl": 0.0035,            # Demersal near-bottom anchor drag (0.002 - 0.005)
    "demersal_trawl": 0.0035,
    "trap": 0.0030,
    "metal_trap": 0.0030,
    "longline": 0.0080,
    "unknown": 0.0125,
}

STOKES_WAVE_COEFFICIENT = 0.015  # beta coefficient for surface wave momentum
TURBULENT_DIFFUSION_KH = 1.0     # Kh = 1.0 m^2/s horizontal eddy diffusivity
TIME_STEP_SECONDS = 3600         # dt = 1 hour (3600 seconds)
GRID_RESOLUTION_DEG = 0.002      # ~220 meters at low latitudes


@dataclass
class DriftSimulationResult:
    """Complete simulation output bundle matching GhostNet AI specification."""
    origin: Dict[str, float]
    gear_type: str
    windage_factor: float
    num_particles: int
    forecast_hours: int
    confidence_score: float
    total_distance_nm: float
    mean_bearing_deg: float
    predicted_final_coordinate: Dict[str, float]
    weather_snapshot: Dict[str, Any]
    predicted_path_geojson: Dict[str, Any]
    drift_heatmap_geojson: Dict[str, Any]
    high_risk_zones_geojson: Dict[str, Any]
    checkpoint_stats: Dict[str, Any]
    generated_at: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "origin": self.origin,
            "gear_type": self.gear_type,
            "windage_factor": self.windage_factor,
            "num_particles": self.num_particles,
            "forecast_hours": self.forecast_hours,
            "confidence_score": self.confidence_score,
            "total_distance_nm": self.total_distance_nm,
            "mean_bearing_deg": self.mean_bearing_deg,
            "predicted_final_coordinate": self.predicted_final_coordinate,
            "weather_snapshot": self.weather_snapshot,
            "predicted_path_geojson": self.predicted_path_geojson,
            "drift_heatmap_geojson": self.drift_heatmap_geojson,
            "high_risk_zones_geojson": self.high_risk_zones_geojson,
            "checkpoint_stats": self.checkpoint_stats,
            "generated_at": self.generated_at,
        }


class LagrangianDriftEngine:
    """
    Monte Carlo Lagrangian Particle Tracking Simulator for Ghost Net drift trajectories.
    """

    def __init__(self, meteo_service: Optional[MarineMeteoService] = None):
        self.meteo_service = meteo_service or MarineMeteoService()

    def run_simulation(
        self,
        origin_lat: float,
        origin_lon: float,
        gear_type: str = "gillnet",
        forecast_hours: int = 72,
        num_particles: int = 5000,
        initial_uncertainty_meters: float = 50.0,
        loss_time: Optional[datetime] = None,
        custom_meteo: Optional[Tuple[MarineSnapshot, HourlyMeteoConditions]] = None,
    ) -> DriftSimulationResult:
        """
        Executes a 5,000-particle Lagrangian drift simulation over the requested forecast horizon.
        """
        forecast_hours = max(6, min(int(forecast_hours), 72))
        num_particles = max(100, int(num_particles))
        gear_key = gear_type.lower().replace(" ", "_")
        alpha = GEAR_WINDAGE_FACTORS.get(gear_key, GEAR_WINDAGE_FACTORS["unknown"])

        # Step 1: Fetch or use supplied marine meteo data
        if custom_meteo:
            snapshot, hourly = custom_meteo
        else:
            snapshot, hourly = self.meteo_service.fetch_conditions(
                origin_lat, origin_lon, forecast_hours=forecast_hours, start_time=loss_time
            )

        # Step 2: Initialize particle ensemble with Gaussian positional perturbation
        # sigma = 50 meters
        rad_lat = math.radians(origin_lat)
        meters_per_deg_lat = (math.pi * EARTH_RADIUS_METERS) / 180.0
        meters_per_deg_lon = meters_per_deg_lat * math.cos(rad_lat)

        init_dx = np.random.normal(0.0, initial_uncertainty_meters, size=num_particles)
        init_dy = np.random.normal(0.0, initial_uncertainty_meters, size=num_particles)

        # Particle coordinates: 2D array [N, 2] -> column 0: Lon, column 1: Lat
        particles_lon = origin_lon + (init_dx / meters_per_deg_lon)
        particles_lat = origin_lat + (init_dy / meters_per_deg_lat)

        # Storage for hourly centroids and checkpoints (24h, 48h, 72h)
        hourly_centroids: List[Tuple[float, float]] = [(origin_lon, origin_lat)]
        checkpoint_particles: Dict[int, Tuple[np.ndarray, np.ndarray]] = {}

        # Precompute stochastic diffusion standard deviation per hour
        # Brownian step: eta * dt ~ Normal(0, sqrt(2 * Kh * dt))
        diffusion_sigma_meters = math.sqrt(2.0 * TURBULENT_DIFFUSION_KH * TIME_STEP_SECONDS)

        # Step 3: Discrete-time trajectory integration loop
        n_steps = min(forecast_hours, len(hourly.u_current))
        for step in range(n_steps):
            u_curr = hourly.u_current[step]
            v_curr = hourly.v_current[step]
            u_wnd = hourly.u_wind[step]
            v_wnd = hourly.v_wind[step]
            u_wav = hourly.u_wave[step]
            v_wav = hourly.v_wave[step]

            # Deterministic velocity vector (m/s)
            u_det = u_curr + (alpha * u_wnd) + (STOKES_WAVE_COEFFICIENT * u_wav)
            v_det = v_curr + (alpha * v_wnd) + (STOKES_WAVE_COEFFICIENT * v_wav)

            # Stochastic turbulent Brownian perturbation for all N particles
            eta_x = np.random.normal(0.0, diffusion_sigma_meters, size=num_particles)
            eta_y = np.random.normal(0.0, diffusion_sigma_meters, size=num_particles)

            # Total displacement in meters over dt (3600s)
            dx_total = (u_det * TIME_STEP_SECONDS) + eta_x
            dy_total = (v_det * TIME_STEP_SECONDS) + eta_y

            # Transform displacement to spherical degree increments
            # Current latitude per particle for accurate zonal scaling
            current_rad_lats = np.radians(particles_lat)
            m_per_deg_lon_arr = meters_per_deg_lat * np.cos(current_rad_lats)

            particles_lat += dy_total / meters_per_deg_lat
            particles_lon += dx_total / m_per_deg_lon_arr

            # Shoreline Land Boundary Condition (Chennai Coastline Barrier)
            # Coastline runs approx along 80.25E (South) to 80.33E (North)
            coastline_lon = 80.25 + 0.07 * np.clip((particles_lat - 12.5) / 1.5, 0.0, 1.0)
            on_land_mask = particles_lon < coastline_lon
            if np.any(on_land_mask):
                # Clamp particles to coastal waters with seaward buffer and deflect alongshore
                particles_lon[on_land_mask] = coastline_lon[on_land_mask] + 0.008
                particles_lat[on_land_mask] += np.abs(dy_total[on_land_mask]) / meters_per_deg_lat

            mean_lon = float(np.mean(particles_lon))
            mean_lat = float(np.mean(particles_lat))
            hourly_centroids.append((round(mean_lon, 5), round(mean_lat, 5)))


            hour_mark = step + 1
            if hour_mark in (24, 48, 72) or hour_mark == n_steps:
                checkpoint_particles[hour_mark] = (particles_lon.copy(), particles_lat.copy())

        # Step 4: Compute summary metrics & confidence score
        final_lon = hourly_centroids[-1][0]
        final_lat = hourly_centroids[-1][1]

        total_dist_meters = self._haversine_distance(origin_lat, origin_lon, final_lat, final_lon)
        total_dist_nm = round(total_dist_meters / METERS_PER_NAUTICAL_MILE, 2)
        mean_bearing = round(self._calculate_bearing(origin_lat, origin_lon, final_lat, final_lon), 1)

        # Particle spread standard deviation at final horizon
        spread_radius_meters = float(
            np.mean(np.hypot(
                (particles_lon - final_lon) * meters_per_deg_lon,
                (particles_lat - final_lat) * meters_per_deg_lat
            ))
        )

        # Confidence decays gracefully as particle dispersion expands over 72h
        # Benchmark: 0.95 at origin, ~0.70 at 72h under typical coastal turbulence
        confidence = max(0.40, min(0.98, round(1.0 - (spread_radius_meters / 35000.0), 3)))

        # Step 5: Build GeoJSON outputs
        path_geojson = self._build_path_geojson(hourly_centroids, checkpoint_particles)
        heatmap_geojson, checkpoint_stats = self._build_density_heatmap_geojson(
            checkpoint_particles, num_particles
        )
        high_risk_geojson = self._build_high_risk_envelope_geojson(checkpoint_particles)

        now_iso = datetime.now(timezone.utc).isoformat()
        weather_dict = {
            "current_velocity_knots": snapshot.current_velocity_knots,
            "current_direction_deg": snapshot.current_direction_deg,
            "wind_speed_knots": snapshot.wind_speed_knots,
            "wind_direction_deg": snapshot.wind_direction_deg,
            "wave_height_m": snapshot.wave_height_m,
            "wave_period_s": snapshot.wave_period_s,
            "source": snapshot.source,
        }

        return DriftSimulationResult(
            origin={"latitude": origin_lat, "longitude": origin_lon},
            gear_type=gear_type,
            windage_factor=alpha,
            num_particles=num_particles,
            forecast_hours=n_steps,
            confidence_score=confidence,
            total_distance_nm=total_dist_nm,
            mean_bearing_deg=mean_bearing,
            predicted_final_coordinate={"latitude": final_lat, "longitude": final_lon},
            weather_snapshot=weather_dict,
            predicted_path_geojson=path_geojson,
            drift_heatmap_geojson=heatmap_geojson,
            high_risk_zones_geojson=high_risk_geojson,
            checkpoint_stats=checkpoint_stats,
            generated_at=now_iso,
        )

    # --------------------------------------------------------------------------
    # Density Gridding & GeoJSON Heatmap Generation (Section 5.2)
    # --------------------------------------------------------------------------
    def _build_density_heatmap_geojson(
        self,
        checkpoints: Dict[int, Tuple[np.ndarray, np.ndarray]],
        total_particles: int,
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Bins particle ensembles into a regular geospatial matrix (d_lat, d_lon = 0.002 deg).
        Vectorizes bins into closed GeoJSON Polygon features categorized by risk tier.
        """
        features: List[Dict[str, Any]] = []
        stats: Dict[str, Any] = {}

        for hour, (lons, lats) in sorted(checkpoints.items()):
            # Determine bounding grid with resolution 0.002 deg (~220m)
            min_lon = np.floor(np.min(lons) / GRID_RESOLUTION_DEG) * GRID_RESOLUTION_DEG
            max_lon = np.ceil(np.max(lons) / GRID_RESOLUTION_DEG) * GRID_RESOLUTION_DEG
            min_lat = np.floor(np.min(lats) / GRID_RESOLUTION_DEG) * GRID_RESOLUTION_DEG
            max_lat = np.ceil(np.max(lats) / GRID_RESOLUTION_DEG) * GRID_RESOLUTION_DEG

            lon_bins = np.arange(min_lon, max_lon + GRID_RESOLUTION_DEG, GRID_RESOLUTION_DEG)
            lat_bins = np.arange(min_lat, max_lat + GRID_RESOLUTION_DEG, GRID_RESOLUTION_DEG)

            hist, _, _ = np.histogram2d(lons, lats, bins=[lon_bins, lat_bins])

            active_indices = np.argwhere(hist > 0)
            if active_indices.size == 0:
                continue

            counts = hist[active_indices[:, 0], active_indices[:, 1]]
            densities = counts / total_particles

            # Compute quantile thresholds for risk stratification
            p75 = np.percentile(counts, 75)
            p90 = np.percentile(counts, 90)
            p97 = np.percentile(counts, 97)

            hour_features = 0
            for idx_pair, count, density in zip(active_indices, counts, densities):
                i, j = idx_pair
                c_min_lon = round(float(lon_bins[i]), 5)
                c_max_lon = round(float(lon_bins[i + 1]), 5)
                c_min_lat = round(float(lat_bins[j]), 5)
                c_max_lat = round(float(lat_bins[j + 1]), 5)

                if count >= p97:
                    risk_level = "critical"
                    score = min(100.0, round(76.0 + 24.0 * (count / max(counts)), 1))
                elif count >= p90:
                    risk_level = "high"
                    score = min(75.0, round(51.0 + 24.0 * ((count - p90) / max(1.0, p97 - p90)), 1))
                elif count >= p75:
                    risk_level = "medium"
                    score = min(50.0, round(26.0 + 24.0 * ((count - p75) / max(1.0, p90 - p75)), 1))
                else:
                    risk_level = "low"
                    score = max(5.0, round(25.0 * (count / max(1.0, p75)), 1))

                poly_coords = [
                    [c_min_lon, c_min_lat],
                    [c_max_lon, c_min_lat],
                    [c_max_lon, c_max_lat],
                    [c_min_lon, c_max_lat],
                    [c_min_lon, c_min_lat],
                ]

                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [poly_coords],
                    },
                    "properties": {
                        "forecast_hour": hour,
                        "particle_count": int(count),
                        "density": round(float(density), 5),
                        "risk_level": risk_level,
                        "score": score,
                    },
                }
                features.append(feature)
                hour_features += 1

            stats[f"hour_{hour}"] = {
                "active_grid_cells": hour_features,
                "center_lat": round(float(np.mean(lats)), 5),
                "center_lon": round(float(np.mean(lons)), 5),
                "p90_particle_density": round(float(p90 / total_particles), 5),
            }

        geojson = {
            "type": "FeatureCollection",
            "features": features,
        }
        return geojson, stats

    # --------------------------------------------------------------------------
    # GeoJSON Path & Centroids
    # --------------------------------------------------------------------------
    def _build_path_geojson(
        self,
        hourly_centroids: List[Tuple[float, float]],
        checkpoints: Dict[int, Tuple[np.ndarray, np.ndarray]],
    ) -> Dict[str, Any]:
        """
        Creates a GeoJSON FeatureCollection containing:
        - LineString of the hourly mean trajectory path
        - Point features for the 24h, 48h, 72h checkpoint markers
        """
        line_coords = [[lon, lat] for lon, lat in hourly_centroids]

        features: List[Dict[str, Any]] = [
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": line_coords,
                },
                "properties": {
                    "type": "predicted_trajectory",
                    "total_hours": len(hourly_centroids) - 1,
                    "color": "#00A896",
                },
            }
        ]

        # Add point features for origin and checkpoints
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": line_coords[0]},
            "properties": {"type": "reported_loss_point", "hour": 0, "title": "Reported Loss Site"},
        })

        for hour, (lons, lats) in sorted(checkpoints.items()):
            mean_pt = [round(float(np.mean(lons)), 5), round(float(np.mean(lats)), 5)]
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": mean_pt},
                "properties": {
                    "type": "checkpoint_centroid",
                    "hour": hour,
                    "title": f"T+{hour}h Estimated Centroid",
                },
            })

        return {"type": "FeatureCollection", "features": features}

    # --------------------------------------------------------------------------
    # High-Risk Cluster Polygon (Top Search Corridor)
    # --------------------------------------------------------------------------
    def _build_high_risk_envelope_geojson(
        self, checkpoints: Dict[int, Tuple[np.ndarray, np.ndarray]]
    ) -> Dict[str, Any]:
        """
        Constructs convex or bounding box envelopes representing prime recovery search corridors.
        """
        features: List[Dict[str, Any]] = []

        for hour, (lons, lats) in sorted(checkpoints.items()):
            # Use 10th-90th percentile to build robust search corridor free of outlier particles
            p10_lon = round(float(np.percentile(lons, 10)), 5)
            p90_lon = round(float(np.percentile(lons, 90)), 5)
            p10_lat = round(float(np.percentile(lats, 10)), 5)
            p90_lat = round(float(np.percentile(lats, 90)), 5)

            bbox_coords = [
                [p10_lon, p10_lat],
                [p90_lon, p10_lat],
                [p90_lon, p90_lat],
                [p10_lon, p90_lat],
                [p10_lon, p10_lat],
            ]

            features.append({
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [bbox_coords]},
                "properties": {
                    "forecast_hour": hour,
                    "zone_type": "primary_search_envelope_80pct",
                    "risk_classification": "CRITICAL" if hour <= 48 else "HIGH",
                },
            })

        return {"type": "FeatureCollection", "features": features}

    # --------------------------------------------------------------------------
    # Geospatial Helpers
    # --------------------------------------------------------------------------
    @staticmethod
    def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Computes great-circle distance between two coordinates in meters."""
        r_lat1 = math.radians(lat1)
        r_lat2 = math.radians(lat2)
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)

        a = (
            math.sin(d_lat / 2.0) ** 2
            + math.cos(r_lat1) * math.cos(r_lat2) * math.sin(d_lon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return EARTH_RADIUS_METERS * c

    @staticmethod
    def _calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Computes compass bearing in degrees [0, 360) from point 1 to point 2."""
        r_lat1 = math.radians(lat1)
        r_lat2 = math.radians(lat2)
        d_lon = math.radians(lon2 - lon1)

        y = math.sin(d_lon) * math.cos(r_lat2)
        x = math.cos(r_lat1) * math.sin(r_lat2) - math.sin(r_lat1) * math.cos(r_lat2) * math.cos(d_lon)
        bearing = math.degrees(math.atan2(y, x))
        return (bearing + 360.0) % 360.0


if __name__ == "__main__":
    print("=" * 70)
    print("🌊 GhostNet AI - 5,000-Particle Lagrangian Drift Simulation Engine")
    print("=" * 70)

    # Initialize engine
    engine = LagrangianDriftEngine()

    # Simulate incident off Kasimedu Fishing Harbour, Chennai
    origin_latitude = 13.1250
    origin_longitude = 80.2970
    net_type = "gillnet"

    print(f"📍 Loss Site: Lat {origin_latitude}°N, Lon {origin_longitude}°E (Kasimedu, Chennai)")
    print(f"🎣 Gear Type: {net_type.upper()} | Ensemble: 5,000 Particles | Horizon: 72 Hours")
    print("⏳ Running physical simulation (Currents + Winds + Waves + Diffusion)...")

    result = engine.run_simulation(
        origin_lat=origin_latitude,
        origin_lon=origin_longitude,
        gear_type=net_type,
        forecast_hours=72,
        num_particles=5000,
    )

    print("\n" + "=" * 70)
    print("✅ SIMULATION RESULTS SUMMARY")
    print("=" * 70)
    print(f"📊 Confidence Score:          {result.confidence_score * 100:.1f}%")
    print(f"📏 Total Drift Distance:        {result.total_distance_nm} Nautical Miles")
    print(f"🧭 Mean Drift Bearing:         {result.mean_bearing_deg}° (Compass Heading)")
    print(f"🎯 Final Predicted Location:   Lat {result.predicted_final_coordinate['latitude']}°N, Lon {result.predicted_final_coordinate['longitude']}°E")
    print(f"🗺️  Heatmap Polygons Created:    {len(result.drift_heatmap_geojson['features'])} GIS grid cells")
    print(f"📈 Trajectory Checkpoints:      {len(result.predicted_path_geojson['features'])} waypoints (24h, 48h, 72h)")
    print("=" * 70)
    print("🎉 Member 1 simulation engine executed successfully!")

