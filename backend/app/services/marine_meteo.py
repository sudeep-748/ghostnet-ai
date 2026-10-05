"""
GhostNet AI - Marine Meteorological Client
Module: backend.app.services.marine_meteo

Fetches oceanographic and marine meteorological forecasts from the Open-Meteo API
(Marine API & Forecast API) for Lagrangian particle drift trajectory modeling.
Decomposes ocean currents, 10m surface winds, and Stokes wave drift into Cartesian
vector components (u, v in m/s).

Includes offline/failover synthesis calibrated for the Bay of Bengal / Chennai coast.
"""

from __future__ import annotations

import json
import logging
import math
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class MarineSnapshot:
    """Summary of instantaneous marine conditions at the origin point."""
    timestamp: str
    current_velocity_knots: float
    current_velocity_ms: float
    current_direction_deg: float
    wind_speed_knots: float
    wind_speed_ms: float
    wind_direction_deg: float
    wave_height_m: float
    wave_direction_deg: float
    wave_period_s: float
    source: str = "open-meteo"


@dataclass
class HourlyMeteoConditions:
    """Hourly time-series vector field inputs for Lagrangian drift integration."""
    timestamps: List[str]
    u_current: np.ndarray  # East-West ocean current (m/s)
    v_current: np.ndarray  # North-South ocean current (m/s)
    u_wind: np.ndarray     # East-West wind velocity (m/s)
    v_wind: np.ndarray     # North-South wind velocity (m/s)
    u_wave: np.ndarray     # East-West Stokes wave drift (m/s)
    v_wave: np.ndarray     # North-South Stokes wave drift (m/s)
    wave_height: np.ndarray
    wave_period: np.ndarray

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamps": self.timestamps,
            "u_current": self.u_current.tolist(),
            "v_current": self.v_current.tolist(),
            "u_wind": self.u_wind.tolist(),
            "v_wind": self.v_wind.tolist(),
            "u_wave": self.u_wave.tolist(),
            "v_wave": self.v_wave.tolist(),
            "wave_height": self.wave_height.tolist(),
            "wave_period": self.wave_period.tolist(),
        }


class MarineMeteoService:
    """
    Client interface for Open-Meteo Marine and Weather APIs with vector decomposition
    and Bay of Bengal / Coromandel Coast synthetic calibration.
    """

    OPEN_METEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
    OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

    # Default physical coefficients
    MS_TO_KNOTS = 1.94384
    KMH_TO_MS = 1.0 / 3.6

    def __init__(self, timeout_seconds: float = 8.0):
        self.timeout = timeout_seconds

    def fetch_conditions(
        self,
        latitude: float,
        longitude: float,
        forecast_hours: int = 72,
        start_time: Optional[datetime] = None,
    ) -> Tuple[MarineSnapshot, HourlyMeteoConditions]:
        """
        Fetches hourly marine and weather forecasts for the specified location.
        Falls back to coastal hydrodynamic synthesis if network is offline or API fails.
        """
        forecast_days = int(math.ceil(forecast_hours / 24.0)) + 1
        forecast_days = max(1, min(forecast_days, 7))

        print(f"  🌐 [LIVE API] Querying Open-Meteo Marine API for Lat {latitude:.4f}, Lon {longitude:.4f}...")
        marine_data = self._query_marine_api(latitude, longitude, forecast_days)

        print(f"  🌐 [LIVE API] Querying Open-Meteo Surface Wind API...")
        weather_data = self._query_weather_api(latitude, longitude, forecast_days)

        if marine_data and weather_data:
            try:
                snapshot, hourly = self._parse_api_responses(
                    marine_data, weather_data, forecast_hours, start_time
                )
                print(f"  ✅ [LIVE API SUCCESS] Received real-time oceanographic forecast from Open-Meteo!")
                print(f"     • Wave Height: {snapshot.wave_height_m}m | Wave Period: {snapshot.wave_period_s}s")
                print(f"     • Ocean Current: {snapshot.current_velocity_knots} knots at {snapshot.current_direction_deg}°")
                print(f"     • Wind Speed: {snapshot.wind_speed_knots} knots at {snapshot.wind_direction_deg}°")
                return snapshot, hourly
            except Exception as exc:
                print(f"  ⚠️ Error parsing live API ({exc}). Using offline Bay of Bengal model.")

        print(f"  ⚠️ Network offline or coordinate on land. Using calibrated Bay of Bengal hydrodynamic model.")
        return self._generate_synthetic_coastal_conditions(
            latitude, longitude, forecast_hours, start_time
        )


    # --------------------------------------------------------------------------
    # API Network Queries
    # --------------------------------------------------------------------------
    def _query_marine_api(
        self, latitude: float, longitude: float, forecast_days: int
    ) -> Optional[Dict[str, Any]]:
        params = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "hourly": "ocean_current_velocity,ocean_current_direction,wave_height,wave_direction,wave_period",
            "forecast_days": forecast_days,
            "timezone": "UTC",
        }
        url = f"{self.OPEN_METEO_MARINE_URL}?{urllib.parse.urlencode(params)}"
        return self._http_get_json(url)

    def _query_weather_api(
        self, latitude: float, longitude: float, forecast_days: int
    ) -> Optional[Dict[str, Any]]:
        params = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "hourly": "wind_speed_10m,wind_direction_10m",
            "wind_speed_unit": "ms",
            "forecast_days": forecast_days,
            "timezone": "UTC",
        }
        url = f"{self.OPEN_METEO_FORECAST_URL}?{urllib.parse.urlencode(params)}"
        return self._http_get_json(url)

    def _http_get_json(self, url: str) -> Optional[Dict[str, Any]]:
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "GhostNetAI-MarineMeteoService/1.0"}
            )
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                if resp.status == 200:
                    return json.loads(resp.read().decode("utf-8"))
        except Exception as err:
            logger.debug("HTTP GET to %s failed: %s", url, err)
        return None

    # --------------------------------------------------------------------------
    # Vector Parsing & Conversions
    # --------------------------------------------------------------------------
    def _parse_api_responses(
        self,
        marine_raw: Dict[str, Any],
        weather_raw: Dict[str, Any],
        forecast_hours: int,
        start_time: Optional[datetime],
    ) -> Tuple[MarineSnapshot, HourlyMeteoConditions]:
        m_hourly = marine_raw.get("hourly", {})
        w_hourly = weather_raw.get("hourly", {})

        times = m_hourly.get("time", [])[:forecast_hours]
        n_steps = len(times)
        if n_steps == 0:
            raise ValueError("No hourly timestamps returned from Marine API")

        # Ocean current velocity (m/s or km/h based on units)
        curr_units = marine_raw.get("hourly_units", {}).get("ocean_current_velocity", "m/s")
        curr_vel = np.array(m_hourly.get("ocean_current_velocity", [0.4] * n_steps)[:n_steps], dtype=float)
        if curr_units == "km/h":
            curr_vel *= self.KMH_TO_MS
        curr_dir = np.array(m_hourly.get("ocean_current_direction", [45.0] * n_steps)[:n_steps], dtype=float)

        # Wind speed & direction
        wind_spd = np.array(w_hourly.get("wind_speed_10m", [5.0] * n_steps)[:n_steps], dtype=float)
        wind_dir = np.array(w_hourly.get("wind_direction_10m", [180.0] * n_steps)[:n_steps], dtype=float)

        # Waves
        wave_ht = np.array(m_hourly.get("wave_height", [1.2] * n_steps)[:n_steps], dtype=float)
        wave_dir = np.array(m_hourly.get("wave_direction", [60.0] * n_steps)[:n_steps], dtype=float)
        wave_prd = np.array(m_hourly.get("wave_period", [6.0] * n_steps)[:n_steps], dtype=float)

        # Replace NaNs if coordinate is close to shoreline
        curr_vel = np.nan_to_num(curr_vel, nan=0.35)
        curr_dir = np.nan_to_num(curr_dir, nan=45.0)
        wind_spd = np.nan_to_num(wind_spd, nan=5.0)
        wind_dir = np.nan_to_num(wind_dir, nan=180.0)
        wave_ht = np.nan_to_num(wave_ht, nan=1.2)
        wave_dir = np.nan_to_num(wave_dir, nan=60.0)
        wave_prd = np.nan_to_num(wave_prd, nan=6.0)

        # Open-Meteo Direction Convention:
        # All directions (current, wind, wave) in Open-Meteo represent the direction FROM which they originate.
        # Therefore, the movement vector pushes TOWARDS (dir + 180 deg), giving -sin(rad) and -cos(rad).
        
        # Decompose ocean current
        curr_rad = np.radians(curr_dir)
        u_curr = -curr_vel * np.sin(curr_rad)
        v_curr = -curr_vel * np.cos(curr_rad)

        # Decompose wind
        wind_rad = np.radians(wind_dir)
        u_wind = -wind_spd * np.sin(wind_rad)
        v_wind = -wind_spd * np.cos(wind_rad)

        # Decompose Stokes wave drift
        wave_rad = np.radians(wave_dir)
        wave_stokes_speed = 0.015 * wave_ht * (2.0 * math.pi / np.maximum(wave_prd, 1.0))
        u_wave = -wave_stokes_speed * np.sin(wave_rad)
        v_wave = -wave_stokes_speed * np.cos(wave_rad)


        now_iso = start_time.isoformat() if start_time else times[0]
        snapshot = MarineSnapshot(
            timestamp=now_iso,
            current_velocity_knots=round(float(curr_vel[0] * self.MS_TO_KNOTS), 2),
            current_velocity_ms=round(float(curr_vel[0]), 3),
            current_direction_deg=round(float(curr_dir[0]), 1),
            wind_speed_knots=round(float(wind_spd[0] * self.MS_TO_KNOTS), 2),
            wind_speed_ms=round(float(wind_spd[0]), 2),
            wind_direction_deg=round(float(wind_dir[0]), 1),
            wave_height_m=round(float(wave_ht[0]), 2),
            wave_direction_deg=round(float(wave_dir[0]), 1),
            wave_period_s=round(float(wave_prd[0]), 1),
            source="open-meteo",
        )

        hourly = HourlyMeteoConditions(
            timestamps=times,
            u_current=u_curr,
            v_current=v_curr,
            u_wind=u_wind,
            v_wind=v_wind,
            u_wave=u_wave,
            v_wave=v_wave,
            wave_height=wave_ht,
            wave_period=wave_prd,
        )
        return snapshot, hourly

    # --------------------------------------------------------------------------
    # Synthetic Bay of Bengal / Chennai Coastal Model
    # --------------------------------------------------------------------------
    def _generate_synthetic_coastal_conditions(
        self,
        latitude: float,
        longitude: float,
        forecast_hours: int,
        start_time: Optional[datetime],
    ) -> Tuple[MarineSnapshot, HourlyMeteoConditions]:
        """
        Calibrated hydrodynamic model for Kasimedu / Chennai coastal waters.
        Simulates:
        - East India Coastal Current (EICC) flowing northward/northeastward
        - Semi-diurnal M2 tidal harmonic oscillation (12.42h period)
        - Diurnal sea breeze oscillation (24h period)
        """
        base_time = start_time or datetime.now(timezone.utc)
        timestamps = [
            datetime.fromtimestamp(base_time.timestamp() + h * 3600, tz=timezone.utc).isoformat()
            for h in range(forecast_hours)
        ]
        h_arr = np.arange(forecast_hours, dtype=float)

        # East India Coastal Current (EICC) background mean: ~0.42 m/s towards NE (35 deg)
        mean_curr_u = 0.28
        mean_curr_v = 0.35

        # M2 Tidal oscillation (12.42h period)
        tidal_freq = 2.0 * math.pi / 12.42
        tidal_u = 0.12 * np.sin(tidal_freq * h_arr)
        tidal_v = 0.16 * np.cos(tidal_freq * h_arr)

        u_curr = mean_curr_u + tidal_u
        v_curr = mean_curr_v + tidal_v

        # Surface Wind: Coastal diurnal cycle (sea-breeze afternoon peak)
        diurnal_freq = 2.0 * math.pi / 24.0
        # Wind blowing toward NW (diurnal shift)
        wind_speed_base = 5.2 + 1.8 * np.sin(diurnal_freq * h_arr - math.pi / 2)
        wind_dir_deg = 160.0 + 20.0 * np.sin(diurnal_freq * h_arr)
        wind_rad = np.radians(wind_dir_deg)
        u_wind = -wind_speed_base * np.sin(wind_rad)
        v_wind = -wind_speed_base * np.cos(wind_rad)

        # Waves: typical Bay of Bengal swell (1.2m - 1.6m, period 6.5s from SE ~120 deg)
        wave_ht = 1.35 + 0.25 * np.sin(diurnal_freq * h_arr)
        wave_prd = np.full(forecast_hours, 6.5)
        wave_dir_deg = np.full(forecast_hours, 120.0)
        wave_rad = np.radians(wave_dir_deg)

        # Stokes wave drift
        wave_celerity = 9.81 * wave_prd / (2.0 * math.pi)
        stokes_mag = 0.015 * wave_ht * (wave_celerity / 10.0)
        u_wave = stokes_mag * np.sin(wave_rad)
        v_wave = stokes_mag * np.cos(wave_rad)

        # Snapshot
        curr_speed_0 = float(np.hypot(u_curr[0], v_curr[0]))
        curr_dir_0 = float((np.degrees(np.arctan2(u_curr[0], v_curr[0])) + 360.0) % 360.0)
        wind_speed_0 = float(wind_speed_base[0])

        snapshot = MarineSnapshot(
            timestamp=timestamps[0],
            current_velocity_knots=round(curr_speed_0 * self.MS_TO_KNOTS, 2),
            current_velocity_ms=round(curr_speed_0, 3),
            current_direction_deg=round(curr_dir_0, 1),
            wind_speed_knots=round(wind_speed_0 * self.MS_TO_KNOTS, 2),
            wind_speed_ms=round(wind_speed_0, 2),
            wind_direction_deg=round(float(wind_dir_deg[0]), 1),
            wave_height_m=round(float(wave_ht[0]), 2),
            wave_direction_deg=round(float(wave_dir_deg[0]), 1),
            wave_period_s=round(float(wave_prd[0]), 1),
            source="synthetic-bay-of-bengal-model",
        )

        hourly = HourlyMeteoConditions(
            timestamps=timestamps,
            u_current=u_curr,
            v_current=v_curr,
            u_wind=u_wind,
            v_wind=v_wind,
            u_wave=u_wave,
            v_wave=v_wave,
            wave_height=wave_ht,
            wave_period=wave_prd,
        )
        return snapshot, hourly
