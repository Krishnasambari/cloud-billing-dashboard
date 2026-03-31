from __future__ import annotations

from fastapi import APIRouter, Query
from app.services.aws_resources import fetch_resources, fetch_resource_stats

router = APIRouter()


@router.get("/stats")
def get_resource_stats(
    region: str = Query(default="ap-south-1"),
    profile: str = Query(default=""),
):
    return fetch_resource_stats(profile=profile or None, region=region)


@router.get("")
def list_resources(
    service_name: str = Query(..., description="AWS service name from Cost Explorer"),
    profile: str = Query(default=""),
):
    resources = fetch_resources(service_name, profile=profile or None)
    return {
        "service_name": service_name,
        "resources": resources,
        "count": len(resources),
        "supported": len(resources) > 0 or _is_supported(service_name),
    }


@router.get("/detail")
def get_service_detail(
    service_name: str = Query(..., description="AWS service name"),
    region: str = Query(default="ap-south-1"),
    profile: str = Query(default=""),
):
    from app.services.aws_resources import fetch_service_detail
    result = fetch_service_detail(service_name, profile=profile or None, region=region)
    return {
        "service_name": service_name,
        "columns": result.get("columns", []),
        "rows": result.get("rows", []),
        "count": len(result.get("rows", [])),
    }


def _is_supported(service_name: str) -> bool:
    from app.services.aws_resources import _MATCHERS
    key = service_name.lower()
    return any(any(k in key for k in keywords) for keywords, _ in _MATCHERS)
