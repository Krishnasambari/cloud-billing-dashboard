from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from app.deps import get_current_user
from app.models.user import User
from app.services.provider_factory import get_resource_provider

router = APIRouter()


@router.get("/stats")
def get_resource_stats(
    region: str = Query(default="ap-south-1"),
    cloud: str = Query(default="aws"),
    cloud_account: str = Query(default=""),
    profile: str = Query(default="", description="Deprecated: use cloud_account"),
    _user: User = Depends(get_current_user),
):
    effective_account = cloud_account or profile
    provider = get_resource_provider(cloud, effective_account, region=region)
    return provider.fetch_resource_stats()


@router.get("")
def list_resources(
    service_name: str = Query(..., description="Cloud service name"),
    cloud: str = Query(default="aws"),
    cloud_account: str = Query(default=""),
    profile: str = Query(default="", description="Deprecated: use cloud_account"),
    _user: User = Depends(get_current_user),
):
    effective_account = cloud_account or profile
    provider = get_resource_provider(cloud, effective_account)
    resources = provider.fetch_resources(service_name)
    return {
        "service_name": service_name,
        "resources": resources,
        "count": len(resources),
        "supported": len(resources) > 0 or _is_supported(cloud, service_name),
    }


@router.get("/detail")
def get_service_detail(
    service_name: str = Query(..., description="Cloud service name"),
    region: str = Query(default="ap-south-1"),
    cloud: str = Query(default="aws"),
    cloud_account: str = Query(default=""),
    profile: str = Query(default="", description="Deprecated: use cloud_account"),
    _user: User = Depends(get_current_user),
):
    effective_account = cloud_account or profile
    provider = get_resource_provider(cloud, effective_account, region=region)
    result = provider.fetch_service_detail(service_name)
    return {
        "service_name": service_name,
        "columns": result.get("columns", []),
        "rows": result.get("rows", []),
        "count": len(result.get("rows", [])),
    }


@router.get("/s3-lens")
def get_s3_storage_lens(
    cloud_account: str = Query(default=""),
    profile: str = Query(default="", description="Deprecated: use cloud_account"),
    _user: User = Depends(get_current_user),
):
    from app.services.aws_resources import fetch_s3_storage_lens
    effective = cloud_account or profile or None
    return fetch_s3_storage_lens(profile=effective)


def _is_supported(cloud: str, service_name: str) -> bool:
    if cloud == "aws":
        from app.services.aws_resources import _MATCHERS
        key = service_name.lower()
        return any(any(k in key for k in keywords) for keywords, _ in _MATCHERS)
    if cloud == "azure":
        from app.services.azure_resource_provider import _SERVICE_QUERIES
        key = service_name.lower()
        return any(key in k.lower() or k.lower() in key for k in _SERVICE_QUERIES)
    return False
