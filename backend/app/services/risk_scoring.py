"""
GhostNet AI - Spatial Risk Scoring Service
Module: backend.app.services.risk_scoring

Evaluates predicted Lagrangian drift heatmaps against real coastal habitat polygons
and human navigation corridors along the Chennai coastline (Bay of Bengal).

Computes the Composite Spatial Risk Score (0 - 100):
Composite Risk = (Density * 0.45) + (Ecological * 0.30) + (FishingActivity * 0.15) + (Navigation * 0.10)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------------------
# Known Spatial Vulnerability Polygons (Chennai Coastline / Kasimedu Pilot)
# ------------------------------------------------------------------------------
CHENNAI_SPATIAL_ZONES = {
    "olive_ridley_nesting_strip": {
        "name": "Olive Ridley Sea Turtle Breeding Strip (Adyar to Kovalam)",
        "type": "ecological",
        "weight_score": 95.0,
        "bbox": [80.2400, 12.7900, 80.2900, 13.0200],  # [min_lon, min_lat, max_lon, max_lat]
        "description": "Critical coastal breeding and nesting corridor for vulnerable Olive Ridley turtles.",
    },
    "adyar_estuary_mouth": {
        "name": "Adyar Estuary & Mangrove Inlets",
        "type": "ecological",
        "weight_score": 90.0,
        "bbox": [80.2650, 12.9950, 80.2850, 13.0150],
        "description": "Sensitive brackish estuary with high juvenile fish and migratory bird entanglement risk.",
    },
    "chennai_port_approach": {
        "name": "Chennai Port & Harbour Commercial Navigation Channel",
        "type": "navigation",
        "weight_score": 85.0,
        "bbox": [80.2900, 13.0800, 80.3500, 13.1200],
        "description": "Major international cargo shipping corridor; ghost nets pose severe propeller entanglement hazard.",
    },
    "ennore_port_channel": {
        "name": "Kamarajar (Ennore) Port Shipping Route",
        "type": "navigation",
        "weight_score": 80.0,
        "bbox": [80.3200, 13.2300, 80.3800, 13.2800],
        "description": "Bulk carrier and energy tanker approach channel.",
    },
    "kasimedu_trawling_grounds": {
        "name": "Kasimedu Mechanized Fishing Trawl Grounds",
        "type": "fishing",
        "weight_score": 75.0,
        "bbox": [80.3000, 13.1100, 80.4200, 13.2200],
        "description": "High density of active artisanal and motorized fishing trawlers.",
    },
}


@dataclass
class RiskZoneMatch:
    zone_id: str
    zone_name: str
    zone_type: str
    overlap_score: float
    description: str


@dataclass
class RiskAssessmentResult:
    composite_risk_score: float
    risk_classification: str  # 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    recommended_action: str
    matched_zones: List[Dict[str, Any]]
    peak_forecast_hour: int
    density_component_score: float
    ecological_component_score: float
    fishing_component_score: float
    navigation_component_score: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "composite_risk_score": self.composite_risk_score,
            "risk_classification": self.risk_classification,
            "recommended_action": self.recommended_action,
            "matched_zones": self.matched_zones,
            "peak_forecast_hour": self.peak_forecast_hour,
            "component_scores": {
                "density": self.density_component_score,
                "ecological": self.ecological_component_score,
                "fishing": self.fishing_component_score,
                "navigation": self.navigation_component_score,
            },
        }


class SpatialRiskScorer:
    """
    Evaluates drift trajectory GeoJSON polygons against coastal vulnerability datasets.
    """

    def __init__(self, custom_zones: Optional[Dict[str, Any]] = None):
        self.zones = custom_zones or CHENNAI_SPATIAL_ZONES

    def evaluate_risk(
        self,
        heatmap_geojson: Dict[str, Any],
        predicted_path_geojson: Optional[Dict[str, Any]] = None,
    ) -> RiskAssessmentResult:
        """
        Calculates composite risk score by evaluating spatial overlap between
        predicted particle density cells and coastal risk zones.
        """
        features = heatmap_geojson.get("features", [])
        if not features:
            return self._default_low_risk()

        max_density_score = 0.0
        peak_hour = 24
        matched_zones_map: Dict[str, RiskZoneMatch] = {}

        max_eco_score = 0.0
        max_nav_score = 0.0
        max_fish_score = 0.0

        for feat in features:
            props = feat.get("properties", {})
            geom = feat.get("geometry", {})
            coords = geom.get("coordinates", [[]])[0]
            if not coords:
                continue

            cell_score = props.get("score", 0.0)
            forecast_hour = props.get("forecast_hour", 24)
            if cell_score > max_density_score:
                max_density_score = cell_score
                peak_hour = forecast_hour

            # Calculate bounding box of this grid cell
            lons = [pt[0] for pt in coords]
            lats = [pt[1] for pt in coords]
            cell_bbox = [min(lons), min(lats), max(lons), max(lats)]

            # Check overlap with all known vulnerability zones
            for z_id, z_data in self.zones.items():
                if self._bboxes_intersect(cell_bbox, z_data["bbox"]):
                    z_type = z_data["type"]
                    z_weight = z_data["weight_score"]

                    if z_type == "ecological":
                        max_eco_score = max(max_eco_score, z_weight)
                    elif z_type == "navigation":
                        max_nav_score = max(max_nav_score, z_weight)
                    elif z_type == "fishing":
                        max_fish_score = max(max_fish_score, z_weight)

                    if z_id not in matched_zones_map:
                        matched_zones_map[z_id] = RiskZoneMatch(
                            zone_id=z_id,
                            zone_name=z_data["name"],
                            zone_type=z_type,
                            overlap_score=z_weight,
                            description=z_data["description"],
                        )

        # Baseline scores if no specific zone touched
        eco_comp = max_eco_score if max_eco_score > 0 else 10.0
        nav_comp = max_nav_score if max_nav_score > 0 else 10.0
        fish_comp = max_fish_score if max_fish_score > 0 else 20.0
        dens_comp = max(10.0, min(100.0, max_density_score))

        # Composite Spatial Risk Formula:
        # (Density * 0.45) + (Ecological * 0.30) + (Fishing * 0.15) + (Navigation * 0.10)
        composite_score = round(
            (dens_comp * 0.45) + (eco_comp * 0.30) + (fish_comp * 0.15) + (nav_comp * 0.10),
            1,
        )

        # Risk Classification (Section 5.3)
        if composite_score >= 76.0:
            classification = "CRITICAL"
            action = "Immediate Recovery Alert — Deploy nearest recovery vessel immediately to protect coastal zone."
        elif composite_score >= 51.0:
            classification = "HIGH"
            action = "Recommend Patrol Mission — Schedule targeted recovery vessel sweep within 24 hours."
        elif composite_score >= 26.0:
            classification = "MEDIUM"
            action = "Add to Watchlist — Track drift progression and alert active fishing trawlers."
        else:
            classification = "LOW"
            action = "Passive Monitoring — Net is in deep offshore pelagic waters with low immediate threat."

        matched_list = [
            {
                "zone_id": m.zone_id,
                "name": m.zone_name,
                "type": m.zone_type,
                "severity": m.overlap_score,
                "description": m.description,
            }
            for m in matched_zones_map.values()
        ]

        return RiskAssessmentResult(
            composite_risk_score=composite_score,
            risk_classification=classification,
            recommended_action=action,
            matched_zones=matched_list,
            peak_forecast_hour=peak_hour,
            density_component_score=round(dens_comp, 1),
            ecological_component_score=round(eco_comp, 1),
            fishing_component_score=round(fish_comp, 1),
            navigation_component_score=round(nav_comp, 1),
        )

    @staticmethod
    def _bboxes_intersect(b1: List[float], b2: List[float]) -> bool:
        """Returns True if two bounding boxes [min_lon, min_lat, max_lon, max_lat] overlap."""
        return not (b1[2] < b2[0] or b1[0] > b2[2] or b1[3] < b2[1] or b1[1] > b2[3])

    @staticmethod
    def _default_low_risk() -> RiskAssessmentResult:
        return RiskAssessmentResult(
            composite_risk_score=15.0,
            risk_classification="LOW",
            recommended_action="Passive Monitoring — Low particle density detected.",
            matched_zones=[],
            peak_forecast_hour=24,
            density_component_score=15.0,
            ecological_component_score=10.0,
            fishing_component_score=10.0,
            navigation_component_score=10.0,
        )
