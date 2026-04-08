from __future__ import annotations


def _azure_credential(tenant_id: str, client_id: str, client_secret: str):
    if tenant_id and client_id and client_secret:
        from azure.identity import ClientSecretCredential
        return ClientSecretCredential(tenant_id, client_id, client_secret)
    from azure.identity import DefaultAzureCredential
    return DefaultAzureCredential()


# KQL queries per service name (as returned by Azure Cost Management "ServiceName" dimension)
_SERVICE_QUERIES: dict[str, str] = {
    "Virtual Machines": (
        "Resources | where type == 'microsoft.compute/virtualmachines' "
        "| project id, name, vmSize=properties.hardwareProfile.vmSize, "
        "state=properties.provisioningState, location"
    ),
    "SQL Databases": (
        "Resources | where type == 'microsoft.sql/servers/databases' "
        "| project id, name, status=properties.status, edition=sku.tier, location"
    ),
    "Storage": (
        "Resources | where type == 'microsoft.storage/storageaccounts' "
        "| project id, name, kind, location, sku=sku.name"
    ),
    "App Service": (
        "Resources | where type == 'microsoft.web/sites' and kind !contains 'functionapp' "
        "| project id, name, state=properties.state, kind, location"
    ),
    "Azure Kubernetes Service": (
        "Resources | where type == 'microsoft.containerservice/managedclusters' "
        "| project id, name, state=properties.provisioningState, k8sVersion=properties.kubernetesVersion, location"
    ),
    "Functions": (
        "Resources | where type == 'microsoft.web/sites' and kind contains 'functionapp' "
        "| project id, name, state=properties.state, kind, location"
    ),
    "Azure Cache for Redis": (
        "Resources | where type == 'microsoft.cache/redis' "
        "| project id, name, state=properties.provisioningState, sku=sku.name, location"
    ),
    "Service Bus": (
        "Resources | where type == 'microsoft.servicebus/namespaces' "
        "| project id, name, state=properties.provisioningState, sku=sku.name, location"
    ),
    "Azure Cosmos DB": (
        "Resources | where type == 'microsoft.documentdb/databaseaccounts' "
        "| project id, name, state=properties.provisioningState, kind, location"
    ),
    "Azure API Management": (
        "Resources | where type == 'microsoft.apimanagement/service' "
        "| project id, name, state=properties.provisioningState, sku=sku.name, location"
    ),
    "Load Balancer": (
        "Resources | where type == 'microsoft.network/loadbalancers' "
        "| project id, name, sku=sku.name, location"
    ),
    "Virtual Network": (
        "Resources | where type == 'microsoft.network/virtualnetworks' "
        "| project id, name, addressSpace=properties.addressSpace.addressPrefixes, location"
    ),
    "Azure Monitor": (
        "Resources | where type == 'microsoft.insights/components' "
        "| project id, name, appType=properties.Application_Type, location"
    ),
    "Key Vault": (
        "Resources | where type == 'microsoft.keyvault/vaults' "
        "| project id, name, state=properties.provisioningState, location"
    ),
}

# Detail columns per service (ordered list matching the KQL project fields, skipping id)
_DETAIL_COLUMNS: dict[str, list[str]] = {
    "Virtual Machines": ["Name", "VM Size", "State", "Location"],
    "SQL Databases": ["Name", "Status", "Edition", "Location"],
    "Storage": ["Name", "Kind", "Location", "SKU"],
    "App Service": ["Name", "State", "Kind", "Location"],
    "Azure Kubernetes Service": ["Name", "State", "K8s Version", "Location"],
    "Functions": ["Name", "State", "Kind", "Location"],
    "Azure Cache for Redis": ["Name", "State", "SKU", "Location"],
    "Service Bus": ["Name", "State", "SKU", "Location"],
    "Azure Cosmos DB": ["Name", "State", "Kind", "Location"],
    "Azure API Management": ["Name", "State", "SKU", "Location"],
    "Load Balancer": ["Name", "SKU", "Location"],
    "Virtual Network": ["Name", "Address Space", "Location"],
    "Azure Monitor": ["Name", "App Type", "Location"],
    "Key Vault": ["Name", "State", "Location"],
}


class AzureResourceProvider:
    def __init__(
        self,
        subscription_id: str,
        tenant_id: str = "",
        client_id: str = "",
        client_secret: str = "",
    ):
        self.subscription_id = subscription_id
        self._cred = _azure_credential(tenant_id, client_id, client_secret)

    def _graph_query(self, kql: str) -> list[dict]:
        from azure.mgmt.resourcegraph import ResourceGraphClient
        from azure.mgmt.resourcegraph.models import QueryRequest
        client = ResourceGraphClient(self._cred)
        req = QueryRequest(subscriptions=[self.subscription_id], query=kql)
        try:
            result = client.resources(req)
            return result.data if result.data else []
        except Exception:
            return []

    def fetch_resources(self, service_name: str) -> list[dict]:
        # Match by exact name or substring
        kql = None
        for key, query in _SERVICE_QUERIES.items():
            if key.lower() in service_name.lower() or service_name.lower() in key.lower():
                kql = query
                break
        if not kql:
            return []
        rows = self._graph_query(kql)
        result = []
        for r in rows:
            rid = str(r.get("id", ""))
            name = str(r.get("name", rid))
            extra = {k: str(v) for k, v in r.items() if k not in ("id", "name") and v is not None}
            detail = " · ".join(f"{v}" for v in extra.values() if v and v != "None")
            result.append({"id": rid, "name": name, "detail": detail})
        return result

    def fetch_service_detail(self, service_name: str) -> dict:
        kql = None
        matched_key = None
        for key, query in _SERVICE_QUERIES.items():
            if key.lower() in service_name.lower() or service_name.lower() in key.lower():
                kql = query
                matched_key = key
                break
        if not kql:
            return {"columns": [], "rows": []}

        raw_rows = self._graph_query(kql)
        columns = _DETAIL_COLUMNS.get(matched_key or "", [])
        if not columns or not raw_rows:
            return {"columns": columns, "rows": []}

        # Map raw dict keys (excluding "id") to column labels in order
        result_rows = []
        for r in raw_rows:
            values = [str(v) for k, v in r.items() if k != "id" and v is not None]
            row_dict: dict[str, str] = {}
            for i, col in enumerate(columns):
                row_dict[col] = values[i] if i < len(values) else "—"
            result_rows.append(row_dict)

        return {"columns": columns, "rows": result_rows}

    def fetch_resource_stats(self) -> dict:
        kql = "Resources | summarize count() by type | project type, count_"
        rows = self._graph_query(kql)
        stats: dict[str, int] = {}
        for r in rows:
            stats[str(r.get("type", ""))] = int(r.get("count_", 0))
        return {
            "VirtualMachines": stats.get("microsoft.compute/virtualmachines", 0),
            "StorageAccounts": stats.get("microsoft.storage/storageaccounts", 0),
            "SQLDatabases": stats.get("microsoft.sql/servers/databases", 0),
            "AppServices": stats.get("microsoft.web/sites", 0),
            "subscription_id": self.subscription_id,
        }
