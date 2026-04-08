from __future__ import annotations
import calendar
import datetime


def _azure_credential(tenant_id: str, client_id: str, client_secret: str):
    """Return a credential object — service principal if configured, else DefaultAzureCredential."""
    if tenant_id and client_id and client_secret:
        from azure.identity import ClientSecretCredential
        return ClientSecretCredential(tenant_id, client_id, client_secret)
    from azure.identity import DefaultAzureCredential
    return DefaultAzureCredential()


class AzureCostProvider:
    def __init__(
        self,
        subscription_id: str,
        tenant_id: str = "",
        client_id: str = "",
        client_secret: str = "",
    ):
        self.subscription_id = subscription_id
        self.scope = f"/subscriptions/{subscription_id}"
        self._cred = _azure_credential(tenant_id, client_id, client_secret)

    def _client(self):
        from azure.mgmt.costmanagement import CostManagementClient
        return CostManagementClient(self._cred)

    @staticmethod
    def _col_index(columns) -> dict[str, int]:
        """Build a name→position map from the API response columns list."""
        return {c.name.lower(): i for i, c in enumerate(columns)}

    def fetch_monthly_totals(self, start_date: str, end_date: str) -> list[dict]:
        from azure.mgmt.costmanagement.models import (
            QueryDefinition, QueryTimePeriod, QueryDataset,
            QueryAggregation, GranularityType, ExportType, TimeframeType,
        )
        client = self._client()
        query = QueryDefinition(
            type=ExportType.ACTUAL_COST,
            timeframe=TimeframeType.CUSTOM,
            time_period=QueryTimePeriod(from_property=start_date, to=end_date),
            dataset=QueryDataset(
                granularity=GranularityType.MONTHLY,
                aggregation={"Cost": QueryAggregation(name="Cost", function="Sum")},
            ),
        )
        result = client.query.usage(self.scope, query)
        col = self._col_index(result.columns)
        rows = []
        for row in (result.rows or []):
            cost_val = float(row[col.get("cost", 0)] or 0)
            currency = str(row[col.get("currency", col.get("billingcurrency", 1))] or "USD")
            raw_date = str(row[col.get("billingmonth", col.get("usagedate", col.get("date", 2)))] or "")
            # Azure returns dates as YYYYMMDD integer or YYYY-MM-DD string
            raw = raw_date.replace("-", "")[:8]
            if len(raw) < 6:
                continue
            year, month = int(raw[:4]), int(raw[4:6])
            last_day = calendar.monthrange(year, month)[1]
            rows.append({
                "period_start": f"{year:04d}-{month:02d}-01",
                "period_end": f"{year:04d}-{month:02d}-{last_day:02d}",
                "total_cost": cost_val,
                "unit": currency,
            })
        return rows

    def fetch_service_breakdown(self, start_date: str, end_date: str) -> list[dict]:
        from azure.mgmt.costmanagement.models import (
            QueryDefinition, QueryTimePeriod, QueryDataset,
            QueryAggregation, QueryGrouping, GranularityType,
            ExportType, TimeframeType,
        )
        client = self._client()
        query = QueryDefinition(
            type=ExportType.ACTUAL_COST,
            timeframe=TimeframeType.CUSTOM,
            time_period=QueryTimePeriod(from_property=start_date, to=end_date),
            dataset=QueryDataset(
                granularity=GranularityType.MONTHLY,
                aggregation={"Cost": QueryAggregation(name="Cost", function="Sum")},
                grouping=[QueryGrouping(type="Dimension", name="ServiceName")],
            ),
        )
        result = client.query.usage(self.scope, query)
        col = self._col_index(result.columns)
        rows = []
        for row in (result.rows or []):
            cost_val = float(row[col.get("cost", 0)] or 0)
            if cost_val == 0.0:
                continue
            currency = str(row[col.get("currency", col.get("billingcurrency", 1))] or "USD")
            raw_date = str(row[col.get("billingmonth", col.get("usagedate", col.get("date", 2)))] or "")
            service = str(row[col.get("servicename", 3)] or "Unknown")
            raw = raw_date.replace("-", "")[:8]
            if len(raw) < 6:
                continue
            year, month = int(raw[:4]), int(raw[4:6])
            last_day = calendar.monthrange(year, month)[1]
            rows.append({
                "period_start": f"{year:04d}-{month:02d}-01",
                "period_end": f"{year:04d}-{month:02d}-{last_day:02d}",
                "service_name": service,
                "cost": cost_val,
                "unit": currency,
            })
        return rows
