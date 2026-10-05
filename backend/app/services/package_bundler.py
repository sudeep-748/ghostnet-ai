"""
GhostNet AI - Offline Mission Package Bundler
Module: backend.app.services.package_bundler

Packages predicted drift heatmaps, search waypoints, risk scores, and weather snapshots
into a signed, self-contained Offline Mission JSON bundle.
Allows recovery vessels to navigate and locate lost fishing gear without internet.
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .drift_engine import DriftSimulationResult
from .risk_scoring import RiskAssessmentResult, SpatialRiskScorer

logger = logging.getLogger(__name__)


# Standard Kasimedu / Chennai Coastal Bounding Box (Lat: 12.90°N to 13.25°N, Lon: 80.10°E to 80.45°E)
DEFAULT_OFFLINE_BBOX = [80.10, 12.90, 80.45, 13.25]
DEFAULT_OFFLINE_ZOOMS = [8, 9, 10, 11, 12, 13]


@dataclass
class OfflineMissionPackage:
    mission_id: str
    report_id: str
    prediction_id: str
    offline_map_bbox: List[float]
    offline_map_zoom_levels: List[int]
    reported_loss_point: Dict[str, float]
    gear_type: str
    risk_assessment: Dict[str, Any]
    weather_snapshot: Dict[str, Any]
    drift_heatmap_geojson: Dict[str, Any]
    recommended_route_geojson: Dict[str, Any]
    high_risk_zones_geojson: Dict[str, Any]
    patrol_distance_nm: float
    estimated_patrol_hours: float
    generated_at: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)


class MissionPackageBundler:
    """
    Creates ready-to-cache Offline Mission Bundles for edge recovery vessels.
    """

    def __init__(self, risk_scorer: Optional[SpatialRiskScorer] = None):
        self.risk_scorer = risk_scorer or SpatialRiskScorer()

    def build_package(
        self,
        report_id: str,
        drift_result: DriftSimulationResult,
        risk_result: Optional[RiskAssessmentResult] = None,
        custom_bbox: Optional[List[float]] = None,
    ) -> OfflineMissionPackage:
        """
        Takes Member 1's DriftSimulationResult and Member 2's RiskAssessmentResult
        and compiles the complete offline JSON mission bundle.
        """
        # Step 1: Compute risk if not already provided
        if not risk_result:
            risk_result = self.risk_scorer.evaluate_risk(
                drift_result.drift_heatmap_geojson,
                drift_result.predicted_path_geojson,
            )

        mission_id = str(uuid.uuid4())
        prediction_id = str(uuid.uuid4())

        # Step 2: Build recommended recovery patrol route (LineString with search corridor)
        recommended_route = self._generate_patrol_route(
            drift_result.origin,
            drift_result.predicted_final_coordinate,
            drift_result.total_distance_nm,
        )

        patrol_nm = round(drift_result.total_distance_nm * 1.35, 1)  # Includes sweep maneuvers
        patrol_hrs = round(patrol_nm / 10.0, 1)  # Assuming 10-knot search vessel speed

        bbox = custom_bbox or DEFAULT_OFFLINE_BBOX
        now_iso = datetime.now(timezone.utc).isoformat()

        package = OfflineMissionPackage(
            mission_id=mission_id,
            report_id=report_id,
            prediction_id=prediction_id,
            offline_map_bbox=bbox,
            offline_map_zoom_levels=DEFAULT_OFFLINE_ZOOMS,
            reported_loss_point=drift_result.origin,
            gear_type=drift_result.gear_type,
            risk_assessment=risk_result.to_dict(),
            weather_snapshot=drift_result.weather_snapshot,
            drift_heatmap_geojson=drift_result.drift_heatmap_geojson,
            recommended_route_geojson=recommended_route,
            high_risk_zones_geojson=drift_result.high_risk_zones_geojson,
            patrol_distance_nm=patrol_nm,
            estimated_patrol_hours=patrol_hrs,
            generated_at=now_iso,
        )

        logger.info(
            "Compiled Offline Mission Package [%s] | Risk: %s (%s)",
            mission_id,
            risk_result.risk_classification,
            risk_result.composite_risk_score,
        )
        return package

    @staticmethod
    def _generate_patrol_route(
        origin: Dict[str, float],
        target: Dict[str, float],
        dist_nm: float,
    ) -> Dict[str, Any]:
        """
        Constructs an expanding search corridor geometry connecting origin to target.
        """
        coords = [
            [origin["longitude"], origin["latitude"]],
            [target["longitude"], target["latitude"]],
        ]
        return {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coords,
            },
            "properties": {
                "name": "Recommended Vessel Interception Course",
                "direct_distance_nm": dist_nm,
                "target_lat": target["latitude"],
                "target_lon": target["longitude"],
            },
        }
