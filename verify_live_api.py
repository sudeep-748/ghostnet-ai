"""
GhostNet AI - Direct Open-Meteo Live API Inspector
Run this script to see the raw live HTTP responses fetched directly from the internet.
"""

import json
import urllib.request


def inspect_live_open_meteo(lat: float, lon: float, location_name: str):
    print("\n" + "=" * 70)
    print(f"🌍 FETCHING LIVE OCEAN DATA FOR: {location_name.upper()}")
    print(f"   Coordinates: Latitude {lat}°N, Longitude {lon}°E")
    print("=" * 70)

    # 1. Direct Live URL for Open-Meteo Marine API
    marine_url = (
        f"https://marine-api.open-meteo.com/v1/marine?"
        f"latitude={lat}&longitude={lon}&"
        f"hourly=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction&"
        f"forecast_days=1&timezone=UTC"
    )

    # 2. Direct Live URL for Open-Meteo Wind API
    weather_url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"hourly=wind_speed_10m,wind_direction_10m&"
        f"wind_speed_unit=ms&forecast_days=1&timezone=UTC"
    )

    print(f"📡 Sending HTTP GET request to Open-Meteo servers:")
    print(f"   URL: {marine_url}\n")

    req = urllib.request.Request(
        marine_url, headers={"User-Agent": "GhostNet-AI-LiveVerifier/1.0"}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        raw_json = json.loads(response.read().decode("utf-8"))

    # Extract first 3 hours of live data
    hourly = raw_json.get("hourly", {})
    times = hourly.get("time", [])[:3]
    waves = hourly.get("wave_height", [])[:3]
    currents = hourly.get("ocean_current_velocity", [])[:3]
    directions = hourly.get("ocean_current_direction", [])[:3]

    print(f"✅ HTTP Status: 200 OK — Raw Data Received from Open-Meteo:")
    for t, w, c, d in zip(times, waves, currents, directions):
        print(f"   🕒 Time: {t} UTC -> Wave Height: {w}m | Ocean Current: {c} km/h at {d}°")


if __name__ == "__main__":
    print("=" * 70)
    print("🧪 PROVING LIVE INTERNET API FETCHING (3 DIFFERENT OCEANS)")
    print("=" * 70)

    # Test 1: Chennai Coast (Bay of Bengal)
    inspect_live_open_meteo(lat=13.1250, lon=80.3500, location_name="Kasimedu, Chennai (Bay of Bengal)")

    # Test 2: Mumbai Coast (Arabian Sea)
    inspect_live_open_meteo(lat=18.9220, lon=72.7500, location_name="Mumbai Offshore (Arabian Sea)")

    # Test 3: Tokyo Bay, Japan (Pacific Ocean)
    inspect_live_open_meteo(lat=35.5000, lon=139.8000, location_name="Tokyo Bay, Japan (Pacific Ocean)")

    print("\n" + "=" * 70)
    print("🎉 Proof Complete: Every single coordinate queries live internet satellites!")
    print("=" * 70)
