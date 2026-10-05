"""
GhostNet AI - Interactive HTML Satellite Drift Visualizer
Generates an interactive Leaflet/MapLibre HTML map of Chennai coastline showing:
- Reported Net Loss Location (Kasimedu Fishing Harbour)
- 72-Hour Mean Predicted Trajectory Path (LineString)
- 24h, 48h, and 72h Probability Density Heatmaps (Colored Polygons)
- Real-time weather and simulation telemetry overlay
"""

import json
import os
import sys
import webbrowser

# Add project root to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from backend.app.services.drift_engine import LagrangianDriftEngine


def generate_interactive_map(output_html_path: str = "chennai_drift_map.html"):
    print("=" * 70)
    print("🗺️ GHOSTNET AI — GENERATING INTERACTIVE CHENNAI DRIFT MAP")
    print("=" * 70)

    # 1. Run the 5,000-particle simulation
    origin_lat = 13.1250
    origin_lon = 80.3800  # Offshore Kasimedu in the Bay of Bengal ocean
    net_type = "gillnet"


    print(f"📍 Simulating 5,000 particles off Kasimedu (Lat: {origin_lat}, Lon: {origin_lon})...")
    engine = LagrangianDriftEngine()
    result = engine.run_simulation(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        gear_type=net_type,
        forecast_hours=72,
        num_particles=5000,
    )

    path_geojson_str = json.dumps(result.predicted_path_geojson)
    heatmap_geojson_str = json.dumps(result.drift_heatmap_geojson)

    # 2. Build standalone interactive HTML with Leaflet.js and OpenStreetMap Satellite Tiles
    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GhostNet AI - Kasimedu Drift Trajectory & Heatmap</title>
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0B192C;
            color: #E0E0E0;
        }}
        #map {{
            width: 100vw;
            height: 100vh;
        }}
        .telemetry-card {{
            position: absolute;
            top: 20px;
            left: 20px;
            z-index: 1000;
            background: rgba(11, 25, 44, 0.92);
            backdrop-filter: blur(8px);
            border: 1px solid #00A896;
            border-radius: 12px;
            padding: 18px 22px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            max-width: 320px;
        }}
        .telemetry-card h2 {{
            margin: 0 0 4px 0;
            font-size: 18px;
            color: #4DD0E1;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .telemetry-card .subtitle {{
            font-size: 11px;
            color: #80CBC4;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }}
        .stat-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 10px;
        }}
        .stat-item {{
            background: rgba(255, 255, 255, 0.05);
            padding: 8px 10px;
            border-radius: 6px;
            border-left: 3px solid #00A896;
        }}
        .stat-label {{
            font-size: 10px;
            color: #90A4AE;
            text-transform: uppercase;
        }}
        .stat-value {{
            font-size: 14px;
            font-weight: bold;
            color: #FFFFFF;
            margin-top: 2px;
        }}
        .legend-card {{
            position: absolute;
            bottom: 30px;
            right: 20px;
            z-index: 1000;
            background: rgba(11, 25, 44, 0.92);
            border: 1px solid #37474F;
            border-radius: 10px;
            padding: 14px 18px;
            font-size: 12px;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }}
        .legend-color {{
            width: 14px;
            height: 14px;
            border-radius: 3px;
        }}
    </style>
</head>
<body>
    <div id="map"></div>

    <div class="telemetry-card">
        <h2>🌊 GhostNet AI</h2>
        <div class="subtitle">Chennai Coastline • Lagrangian Drift Model</div>
        
        <div class="stat-grid">
            <div class="stat-item">
                <div class="stat-label">Gear Type</div>
                <div class="stat-value">{result.gear_type.upper()}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Particles</div>
                <div class="stat-value">{result.num_particles:,}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Total Drift</div>
                <div class="stat-value">{result.total_distance_nm} NM</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Heading</div>
                <div class="stat-value">{result.mean_bearing_deg}° NE</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Confidence</div>
                <div class="stat-value" style="color: #69F0AE;">{result.confidence_score * 100:.1f}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Wave Height</div>
                <div class="stat-value">{result.weather_snapshot['wave_height_m']} m</div>
            </div>
        </div>
        <div style="margin-top: 14px; font-size: 11px; color: #B0BEC5;">
            📍 <strong>Final (T+72h):</strong> Lat {result.predicted_final_coordinate['latitude']}°, Lon {result.predicted_final_coordinate['longitude']}°
        </div>
    </div>

    <div class="legend-card">
        <div style="font-weight: bold; margin-bottom: 8px; color: #4DD0E1;">Probability Heatmap</div>
        <div class="legend-item"><div class="legend-color" style="background: #E53935;"></div> Critical Probability (Top 3%)</div>
        <div class="legend-item"><div class="legend-color" style="background: #FB8C00;"></div> High Probability (Top 10%)</div>
        <div class="legend-item"><div class="legend-color" style="background: #FDD835;"></div> Medium Probability (Top 25%)</div>
        <div class="legend-item"><div class="legend-color" style="background: #26C6DA;"></div> Low Probability Dispersion</div>
        <div class="legend-item" style="margin-top: 8px;"><div class="legend-color" style="background: #00E676; height: 3px;"></div> Mean Trajectory Path</div>
    </div>

    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Initialize Map centered on Kasimedu / Chennai Coast
        const map = L.map('map', {{
            center: [{origin_lat}, {origin_lon}],
            zoom: 11,
            zoomControl: false
        }});

        L.control.zoom({{ position: 'topright' }}).addTo(map);

        // 100% Free Satellite / Ocean Map Layer (Esri World Imagery + OpenStreetMap) - NO WATERMARK
        const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{{z}}/{{y}}/{{x}}', {{
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18
        }}).addTo(map);

        const osmStreets = L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }});

        // Layer Control
        L.control.layers({{
            "🛰️ Satellite Imagery": esriSatellite,
            "🗺️ Ocean & Coastal Map": osmStreets
        }}, null, {{ position: 'topright' }}).addTo(map);



        // Load Heatmap Polygons GeoJSON
        const heatmapData = {heatmap_geojson_str};
        L.geoJSON(heatmapData, {{
            style: function (feature) {{
                const level = feature.properties.risk_level;
                let fillColor = '#26C6DA';
                let opacity = 0.45;
                if (level === 'critical') {{
                    fillColor = '#E53935';
                    opacity = 0.85;
                }} else if (level === 'high') {{
                    fillColor = '#FB8C00';
                    opacity = 0.70;
                }} else if (level === 'medium') {{
                    fillColor = '#FDD835';
                    opacity = 0.55;
                }}
                return {{
                    color: fillColor,
                    weight: 1,
                    fillColor: fillColor,
                    fillOpacity: opacity
                }};
            }},
            onEachFeature: function (feature, layer) {{
                layer.bindPopup(
                    `<strong>Forecast Horizon: T+${{feature.properties.forecast_hour}}h</strong><br/>` +
                    `Risk Classification: <b style="text-transform:uppercase;">${{feature.properties.risk_level}}</b><br/>` +
                    `Particle Density: ${{(feature.properties.density * 100).toFixed(2)}}%<br/>` +
                    `Particles in Cell: ${{feature.properties.particle_count}}`
                );
            }}
        }}).addTo(map);

        // Load Trajectory LineString GeoJSON
        const pathData = {path_geojson_str};
        L.geoJSON(pathData, {{
            style: function (feature) {{
                if (feature.geometry.type === 'LineString') {{
                    return {{
                        color: '#00E676',
                        weight: 4,
                        dashArray: '4, 4',
                        opacity: 0.9
                    }};
                }}
            }},
            pointToLayer: function (feature, latlng) {{
                if (feature.properties.type === 'reported_loss_point') {{
                    return L.circleMarker(latlng, {{
                        radius: 8,
                        fillColor: '#FF1744',
                        color: '#FFFFFF',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.9
                    }}).bindPopup('<b>📍 Reported Net Loss Site</b><br/>Kasimedu Coastal Waters');
                }} else {{
                    return L.circleMarker(latlng, {{
                        radius: 5,
                        fillColor: '#00E676',
                        color: '#FFFFFF',
                        weight: 1.5,
                        opacity: 1,
                        fillOpacity: 0.8
                    }}).bindPopup(`<b>Checkpoint: T+${{feature.properties.hour}} Hours</b>`);
                }}
            }}
        }}).addTo(map);
    </script>
</body>
</html>
"""

    full_output_path = os.path.join(current_dir, output_html_path)
    with open(full_output_path, "w", encoding="utf-8") as f:
        f.write(html_template)

    print(f"✅ Interactive Map HTML successfully created!")
    print(f"📁 Saved to: {full_output_path}")
    print("\n👉 Opening the map in your default web browser...")

    try:
        webbrowser.open(f"file://{full_output_path}")
    except Exception as e:
        print(f"Note: You can double-click '{output_html_path}' to view it in Chrome or Edge.")


if __name__ == "__main__":
    generate_interactive_map()
