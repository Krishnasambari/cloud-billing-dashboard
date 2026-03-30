from __future__ import annotations

import boto3
import botocore.exceptions


class AWSError(Exception):
    pass


def _get_ce_client(profile: str):
    try:
        session = boto3.Session(profile_name=profile)
        # Cost Explorer is a global service — must use us-east-1
        return session.client("ce", region_name="us-east-1")
    except botocore.exceptions.ProfileNotFound as e:
        raise AWSError(f"AWS profile '{profile}' not found: {e}") from e


def fetch_monthly_totals(
    start_date: str,
    end_date: str,
    profile: str = "default",
) -> list[dict]:
    """
    Returns list of:
      {period_start, period_end, total_cost, unit}
    for each month in [start_date, end_date).
    """
    client = _get_ce_client(profile)
    results = []
    kwargs: dict = {
        "TimePeriod": {"Start": start_date, "End": end_date},
        "Granularity": "MONTHLY",
        "Metrics": ["BlendedCost"],
    }

    try:
        while True:
            response = client.get_cost_and_usage(**kwargs)
            for item in response["ResultsByTime"]:
                cost_val = item["Total"]["BlendedCost"]
                results.append(
                    {
                        "period_start": item["TimePeriod"]["Start"],
                        "period_end": item["TimePeriod"]["End"],
                        "total_cost": float(cost_val["Amount"]),
                        "unit": cost_val["Unit"],
                    }
                )
            token = response.get("NextPageToken")
            if not token:
                break
            kwargs["NextPageToken"] = token
    except botocore.exceptions.ClientError as e:
        raise AWSError(f"Cost Explorer API error: {e}") from e

    return results


def fetch_service_breakdown(
    start_date: str,
    end_date: str,
    profile: str = "default",
) -> list[dict]:
    """
    Returns list of:
      {period_start, period_end, service_name, cost, unit}
    for each (month, service) combination.
    """
    client = _get_ce_client(profile)
    results = []
    kwargs: dict = {
        "TimePeriod": {"Start": start_date, "End": end_date},
        "Granularity": "MONTHLY",
        "Metrics": ["BlendedCost"],
        "GroupBy": [{"Type": "DIMENSION", "Key": "SERVICE"}],
    }

    try:
        while True:
            response = client.get_cost_and_usage(**kwargs)
            for item in response["ResultsByTime"]:
                period_start = item["TimePeriod"]["Start"]
                period_end = item["TimePeriod"]["End"]
                for group in item.get("Groups", []):
                    service_name = group["Keys"][0]
                    cost_val = group["Metrics"]["BlendedCost"]
                    cost_amount = float(cost_val["Amount"])
                    if cost_amount == 0.0:
                        continue
                    results.append(
                        {
                            "period_start": period_start,
                            "period_end": period_end,
                            "service_name": service_name,
                            "cost": cost_amount,
                            "unit": cost_val["Unit"],
                        }
                    )
            token = response.get("NextPageToken")
            if not token:
                break
            kwargs["NextPageToken"] = token
    except botocore.exceptions.ClientError as e:
        raise AWSError(f"Cost Explorer API error: {e}") from e

    return results
