from __future__ import annotations
from app.config import settings


def get_cost_provider(cloud: str, cloud_account: str):
    if cloud == "aws":
        from app.services.aws_provider import AWSCostProvider
        return AWSCostProvider(profile=cloud_account, region=settings.AWS_REGION)
    if cloud == "azure":
        from app.services.azure_cost_provider import AzureCostProvider
        return AzureCostProvider(
            subscription_id=cloud_account,
            tenant_id=settings.AZURE_TENANT_ID,
            client_id=settings.AZURE_CLIENT_ID,
            client_secret=settings.AZURE_CLIENT_SECRET,
        )
    raise ValueError(f"Unsupported cloud: {cloud!r}")


def get_resource_provider(cloud: str, cloud_account: str, region: str = ""):
    if cloud == "aws":
        from app.services.aws_provider import AWSResourceProvider
        return AWSResourceProvider(profile=cloud_account or None, region=region)
    if cloud == "azure":
        from app.services.azure_resource_provider import AzureResourceProvider
        return AzureResourceProvider(
            subscription_id=cloud_account,
            tenant_id=settings.AZURE_TENANT_ID,
            client_id=settings.AZURE_CLIENT_ID,
            client_secret=settings.AZURE_CLIENT_SECRET,
        )
    raise ValueError(f"Unsupported cloud: {cloud!r}")
