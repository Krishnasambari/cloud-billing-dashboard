from __future__ import annotations
from app.config import settings


class AWSCostProvider:
    def __init__(self, profile: str, region: str = ""):
        self.profile = profile
        self.region = region or settings.AWS_REGION

    def fetch_monthly_totals(self, start_date: str, end_date: str) -> list[dict]:
        from app.services.aws_cost_explorer import fetch_monthly_totals
        return fetch_monthly_totals(start_date, end_date, profile=self.profile)

    def fetch_service_breakdown(self, start_date: str, end_date: str) -> list[dict]:
        from app.services.aws_cost_explorer import fetch_service_breakdown
        return fetch_service_breakdown(start_date, end_date, profile=self.profile)


class AWSResourceProvider:
    def __init__(self, profile: str | None, region: str):
        self.profile = profile
        self.region = region or settings.AWS_REGION

    def fetch_resources(self, service_name: str) -> list[dict]:
        from app.services.aws_resources import fetch_resources
        return fetch_resources(service_name, profile=self.profile)

    def fetch_service_detail(self, service_name: str) -> dict:
        from app.services.aws_resources import fetch_service_detail
        return fetch_service_detail(service_name, profile=self.profile, region=self.region)

    def fetch_resource_stats(self) -> dict:
        from app.services.aws_resources import fetch_resource_stats
        return fetch_resource_stats(profile=self.profile, region=self.region)
