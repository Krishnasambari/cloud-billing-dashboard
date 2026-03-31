from __future__ import annotations

import boto3
import botocore.exceptions
from app.config import settings


class AWSError(Exception):
    pass


def _client(service: str, profile: str | None):
    try:
        session = boto3.Session(profile_name=profile or None, region_name=settings.AWS_REGION)
        return session.client(service)
    except botocore.exceptions.ProfileNotFound as e:
        raise AWSError(str(e)) from e


def _safe(fn):
    """Catch all boto3 errors and return empty list."""
    try:
        return fn()
    except Exception:
        return []


# ── helpers ──────────────────────────────────────────────────────────────────

def _tag(tags: list[dict], key: str = "Name") -> str:
    for t in tags or []:
        if t.get("Key") == key:
            return t.get("Value", "")
    return ""


# ── per-service fetchers ──────────────────────────────────────────────────────

def _ec2_instances(profile: str) -> list[dict]:
    ec2 = _client("ec2", profile)

    def fetch():
        resources = []
        paginator = ec2.get_paginator("describe_instances")
        for page in paginator.paginate():
            for r in page["Reservations"]:
                for i in r["Instances"]:
                    name = _tag(i.get("Tags", []))
                    iid = i["InstanceId"]
                    resources.append({
                        "id": iid,
                        "name": name or iid,
                        "detail": f"{i.get('InstanceType','')} · {i.get('State',{}).get('Name','')}",
                    })
        return resources

    return _safe(fetch)


def _rds_instances(profile: str) -> list[dict]:
    rds = _client("rds", profile)

    def fetch():
        resources = []
        paginator = rds.get_paginator("describe_db_instances")
        for page in paginator.paginate():
            for db in page["DBInstances"]:
                resources.append({
                    "id": db["DBInstanceIdentifier"],
                    "name": db["DBInstanceIdentifier"],
                    "detail": f"{db.get('DBInstanceClass','')} · {db.get('Engine','')} · {db.get('DBInstanceStatus','')}",
                })
        return resources

    return _safe(fetch)


def _s3_buckets(profile: str) -> list[dict]:
    s3 = _client("s3", profile)

    def fetch():
        resp = s3.list_buckets()
        return [
            {"id": b["Name"], "name": b["Name"], "detail": "S3 Bucket"}
            for b in resp.get("Buckets", [])
        ]

    return _safe(fetch)


def _lambda_functions(profile: str) -> list[dict]:
    fn = _client("lambda", profile)

    def fetch():
        resources = []
        paginator = fn.get_paginator("list_functions")
        for page in paginator.paginate():
            for f in page["Functions"]:
                resources.append({
                    "id": f["FunctionName"],
                    "name": f["FunctionName"],
                    "detail": f"{f.get('Runtime','')} · {f.get('MemorySize','')}MB",
                })
        return resources

    return _safe(fetch)


def _cloudfront_distributions(profile: str) -> list[dict]:
    # CloudFront is global
    session = boto3.Session(profile_name=profile)
    cf = session.client("cloudfront")

    def fetch():
        resources = []
        paginator = cf.get_paginator("list_distributions")
        for page in paginator.paginate():
            for d in page.get("DistributionList", {}).get("Items", []):
                alias = (d.get("Aliases", {}).get("Items") or [d["DomainName"]])[0]
                resources.append({
                    "id": d["Id"],
                    "name": alias,
                    "detail": d.get("Status", ""),
                })
        return resources

    return _safe(fetch)


def _elb_load_balancers(profile: str) -> list[dict]:
    elb = _client("elbv2", profile)

    def fetch():
        resources = []
        paginator = elb.get_paginator("describe_load_balancers")
        for page in paginator.paginate():
            for lb in page["LoadBalancers"]:
                resources.append({
                    "id": lb["LoadBalancerArn"].split("/")[-1],
                    "name": lb["LoadBalancerName"],
                    "detail": f"{lb.get('Type','')} · {lb.get('State',{}).get('Code','')}",
                })
        return resources

    return _safe(fetch)


def _elasticache_clusters(profile: str) -> list[dict]:
    ec = _client("elasticache", profile)

    def fetch():
        resources = []
        paginator = ec.get_paginator("describe_cache_clusters")
        for page in paginator.paginate():
            for c in page["CacheClusters"]:
                resources.append({
                    "id": c["CacheClusterId"],
                    "name": c["CacheClusterId"],
                    "detail": f"{c.get('CacheNodeType','')} · {c.get('Engine','')} · {c.get('CacheClusterStatus','')}",
                })
        return resources

    return _safe(fetch)


def _sqs_queues(profile: str) -> list[dict]:
    sqs = _client("sqs", profile)

    def fetch():
        resources = []
        resp = sqs.list_queues()
        for url in resp.get("QueueUrls", []):
            name = url.rstrip("/").split("/")[-1]
            resources.append({"id": url, "name": name, "detail": "SQS Queue"})
        return resources

    return _safe(fetch)


def _sns_topics(profile: str) -> list[dict]:
    sns = _client("sns", profile)

    def fetch():
        resources = []
        paginator = sns.get_paginator("list_topics")
        for page in paginator.paginate():
            for t in page["Topics"]:
                arn = t["TopicArn"]
                name = arn.split(":")[-1]
                resources.append({"id": arn, "name": name, "detail": "SNS Topic"})
        return resources

    return _safe(fetch)


def _route53_zones(profile: str) -> list[dict]:
    session = boto3.Session(profile_name=profile)
    r53 = session.client("route53")

    def fetch():
        resources = []
        paginator = r53.get_paginator("list_hosted_zones")
        for page in paginator.paginate():
            for z in page["HostedZones"]:
                resources.append({
                    "id": z["Id"].split("/")[-1],
                    "name": z["Name"],
                    "detail": "Private" if z.get("Config", {}).get("PrivateZone") else "Public",
                })
        return resources

    return _safe(fetch)


def _kms_keys(profile: str) -> list[dict]:
    kms = _client("kms", profile)

    def fetch():
        resources = []
        paginator = kms.get_paginator("list_keys")
        for page in paginator.paginate():
            for k in page["Keys"]:
                try:
                    meta = kms.describe_key(KeyId=k["KeyId"])["KeyMetadata"]
                    if meta.get("KeyState") == "Enabled":
                        alias = meta.get("KeyId", k["KeyId"])
                        resources.append({
                            "id": k["KeyId"],
                            "name": alias,
                            "detail": meta.get("Description", ""),
                        })
                except Exception:
                    pass
        return resources

    return _safe(fetch)


def _secrets(profile: str) -> list[dict]:
    sm = _client("secretsmanager", profile)

    def fetch():
        resources = []
        paginator = sm.get_paginator("list_secrets")
        for page in paginator.paginate():
            for s in page["SecretList"]:
                resources.append({
                    "id": s["ARN"].split(":")[-1],
                    "name": s["Name"],
                    "detail": s.get("Description", ""),
                })
        return resources

    return _safe(fetch)


def _codepipeline_pipelines(profile: str) -> list[dict]:
    cp = _client("codepipeline", profile)

    def fetch():
        resp = cp.list_pipelines()
        return [
            {"id": p["name"], "name": p["name"], "detail": "CodePipeline"}
            for p in resp.get("pipelines", [])
        ]

    return _safe(fetch)


def _codecommit_repos(profile: str) -> list[dict]:
    cc = _client("codecommit", profile)

    def fetch():
        resp = cc.list_repositories()
        return [
            {"id": r["repositoryId"], "name": r["repositoryName"], "detail": "CodeCommit Repo"}
            for r in resp.get("repositories", [])
        ]

    return _safe(fetch)


def _kinesis_firehose(profile: str) -> list[dict]:
    fh = _client("firehose", profile)

    def fetch():
        resp = fh.list_delivery_streams()
        return [
            {"id": name, "name": name, "detail": "Kinesis Firehose"}
            for name in resp.get("DeliveryStreamNames", [])
        ]

    return _safe(fetch)


def _waf_web_acls(profile: str) -> list[dict]:
    waf = _client("wafv2", profile)

    def fetch():
        resources = []
        for scope in ("REGIONAL", "CLOUDFRONT"):
            try:
                resp = waf.list_web_acls(Scope=scope, Limit=100)
                for acl in resp.get("WebACLs", []):
                    resources.append({
                        "id": acl["Id"],
                        "name": acl["Name"],
                        "detail": scope,
                    })
            except Exception:
                pass
        return resources

    return _safe(fetch)


def _api_gateway_apis(profile: str) -> list[dict]:
    apigw = _client("apigateway", profile)

    def fetch():
        resources = []
        paginator = apigw.get_paginator("get_rest_apis")
        for page in paginator.paginate():
            for api in page["items"]:
                resources.append({
                    "id": api["id"],
                    "name": api["name"],
                    "detail": api.get("description", "REST API"),
                })
        return resources

    return _safe(fetch)


def _vpc_nat_gateways(profile: str) -> list[dict]:
    ec2 = _client("ec2", profile)

    def fetch():
        resources = []
        paginator = ec2.get_paginator("describe_nat_gateways")
        for page in paginator.paginate():
            for gw in page["NatGateways"]:
                name = _tag(gw.get("Tags", []))
                gid = gw["NatGatewayId"]
                resources.append({
                    "id": gid,
                    "name": name or gid,
                    "detail": f"NAT Gateway · {gw.get('State','')}",
                })
        return resources

    return _safe(fetch)


def _cloudwatch_alarms(profile: str) -> list[dict]:
    cw = _client("cloudwatch", profile)

    def fetch():
        resources = []
        paginator = cw.get_paginator("describe_alarms")
        for page in paginator.paginate():
            for alarm in page["MetricAlarms"]:
                resources.append({
                    "id": alarm["AlarmName"],
                    "name": alarm["AlarmName"],
                    "detail": alarm.get("StateValue", ""),
                })
        return resources

    return _safe(fetch)


# ── service name → fetcher mapping ────────────────────────────────────────────

_MATCHERS: list[tuple[list[str], callable]] = [
    (["elastic compute cloud", "ec2"], _ec2_instances),
    (["relational database"], _rds_instances),
    (["simple storage service", "amazon s3"], _s3_buckets),
    (["lambda"], _lambda_functions),
    (["cloudfront"], _cloudfront_distributions),
    (["elastic load balancing"], _elb_load_balancers),
    (["elasticache"], _elasticache_clusters),
    (["simple queue service", "sqs"], _sqs_queues),
    (["simple notification service", "sns"], _sns_topics),
    (["route 53"], _route53_zones),
    (["key management service", "kms"], _kms_keys),
    (["secrets manager"], _secrets),
    (["codepipeline"], _codepipeline_pipelines),
    (["codecommit"], _codecommit_repos),
    (["kinesis firehose"], _kinesis_firehose),
    (["waf"], _waf_web_acls),
    (["api gateway"], _api_gateway_apis),
    (["virtual private cloud", "vpc"], _vpc_nat_gateways),
    (["cloudwatch"], _cloudwatch_alarms),
]


def fetch_resources(service_name: str, profile: str | None = None) -> list[dict]:
    key = service_name.lower()
    for keywords, fetcher in _MATCHERS:
        if any(k in key for k in keywords):
            return fetcher(profile)
    return []


def fetch_resource_stats(profile: str | None, region: str) -> dict:
    """Return summary counts for the Resources dashboard page."""

    def session():
        return boto3.Session(profile_name=profile or None, region_name=region)

    # ── EC2 instances ────────────────────────────────────────────────────────
    ec2_total = ec2_running = ec2_stopped = 0
    try:
        ec2 = session().client("ec2")
        paginator = ec2.get_paginator("describe_instances")
        for page in paginator.paginate():
            for r in page["Reservations"]:
                for i in r["Instances"]:
                    ec2_total += 1
                    state = i.get("State", {}).get("Name", "")
                    if state == "running":
                        ec2_running += 1
                    elif state == "stopped":
                        ec2_stopped += 1
    except Exception:
        pass

    # ── Elastic IPs ──────────────────────────────────────────────────────────
    eip_total = eip_attached = eip_free = 0
    try:
        ec2 = session().client("ec2")
        resp = ec2.describe_addresses()
        for addr in resp.get("Addresses", []):
            eip_total += 1
            if addr.get("AssociationId"):
                eip_attached += 1
            else:
                eip_free += 1
    except Exception:
        pass

    # ── EBS Volumes ──────────────────────────────────────────────────────────
    vol_total = vol_used = vol_free = 0
    try:
        ec2 = session().client("ec2")
        paginator = ec2.get_paginator("describe_volumes")
        for page in paginator.paginate():
            for v in page["Volumes"]:
                vol_total += 1
                if v.get("State") == "in-use":
                    vol_used += 1
                elif v.get("State") == "available":
                    vol_free += 1
    except Exception:
        pass

    # ── Snapshots (owned by self) ────────────────────────────────────────────
    snap_total = 0
    try:
        ec2 = session().client("ec2")
        paginator = ec2.get_paginator("describe_snapshots")
        for page in paginator.paginate(OwnerIds=["self"]):
            snap_total += len(page.get("Snapshots", []))
    except Exception:
        pass

    # ── AMIs (owned by self) ─────────────────────────────────────────────────
    ami_total = 0
    try:
        ec2 = session().client("ec2")
        resp = ec2.describe_images(Owners=["self"])
        ami_total = len(resp.get("Images", []))
    except Exception:
        pass

    # ── S3 Buckets (global) ──────────────────────────────────────────────────
    bucket_total = 0
    try:
        s3 = boto3.Session(profile_name=profile or None).client("s3")
        resp = s3.list_buckets()
        bucket_total = len(resp.get("Buckets", []))
    except Exception:
        pass

    # ── Load Balancers ───────────────────────────────────────────────────────
    lb_total = 0
    try:
        elb = session().client("elbv2")
        paginator = elb.get_paginator("describe_load_balancers")
        for page in paginator.paginate():
            lb_total += len(page.get("LoadBalancers", []))
    except Exception:
        pass

    return {
        "region": region,
        "EC2": {"Total": ec2_total, "Running": ec2_running, "Stopped": ec2_stopped},
        "ElasticIP": {"Total": eip_total, "Attached": eip_attached, "NotAttached": eip_free},
        "Volumes": {"Total": vol_total, "InUse": vol_used, "Available": vol_free},
        "Snapshots": {"Total": snap_total},
        "AMIs": {"Total": ami_total},
        "S3": {"TotalBuckets": bucket_total},
        "LoadBalancers": {"Total": lb_total},
    }


# ── per-service detail fetchers (rich tabular data) ──────────────────────────

def _ec2_detail(profile: str | None, region: str) -> dict:
    columns = ["Instance Name", "Instance ID", "Type", "State", "Elastic IP", "Volume Size"]

    def fetch():
        session = boto3.Session(profile_name=profile or None, region_name=region)
        ec2 = session.client("ec2")

        eip_map: dict[str, str] = {}
        try:
            for addr in ec2.describe_addresses().get("Addresses", []):
                if addr.get("InstanceId"):
                    eip_map[addr["InstanceId"]] = addr.get("PublicIp", "")
        except Exception:
            pass

        vol_map: dict[str, int] = {}
        try:
            paginator = ec2.get_paginator("describe_volumes")
            for page in paginator.paginate():
                for v in page["Volumes"]:
                    for att in v.get("Attachments", []):
                        iid = att.get("InstanceId", "")
                        if iid:
                            vol_map[iid] = vol_map.get(iid, 0) + v.get("Size", 0)
        except Exception:
            pass

        rows = []
        paginator = ec2.get_paginator("describe_instances")
        for page in paginator.paginate():
            for r in page["Reservations"]:
                for i in r["Instances"]:
                    iid = i["InstanceId"]
                    name = _tag(i.get("Tags", []))
                    vol_gb = vol_map.get(iid, 0)
                    rows.append({
                        "Instance Name": name or "—",
                        "Instance ID": iid,
                        "Type": i.get("InstanceType", "—"),
                        "State": i.get("State", {}).get("Name", "—"),
                        "Elastic IP": eip_map.get(iid, "—"),
                        "Volume Size": f"{vol_gb} GB" if vol_gb else "—",
                    })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _rds_detail(profile: str | None, region: str) -> dict:
    columns = ["DB Identifier", "Engine", "Class", "Status", "Multi-AZ", "Storage (GB)"]

    def fetch():
        rds = boto3.Session(profile_name=profile or None, region_name=region).client("rds")
        rows = []
        paginator = rds.get_paginator("describe_db_instances")
        for page in paginator.paginate():
            for db in page["DBInstances"]:
                rows.append({
                    "DB Identifier": db["DBInstanceIdentifier"],
                    "Engine": f"{db.get('Engine','')} {db.get('EngineVersion','')}",
                    "Class": db.get("DBInstanceClass", "—"),
                    "Status": db.get("DBInstanceStatus", "—"),
                    "Multi-AZ": "Yes" if db.get("MultiAZ") else "No",
                    "Storage (GB)": str(db.get("AllocatedStorage", "—")),
                })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _s3_detail(profile: str | None) -> dict:
    columns = ["Bucket Name", "Creation Date"]

    def fetch():
        s3 = boto3.Session(profile_name=profile or None).client("s3")
        rows = []
        for b in s3.list_buckets().get("Buckets", []):
            rows.append({
                "Bucket Name": b["Name"],
                "Creation Date": str(b.get("CreationDate", ""))[:10],
            })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _lambda_detail(profile: str | None, region: str) -> dict:
    columns = ["Function Name", "Runtime", "Memory (MB)", "Timeout (s)"]

    def fetch():
        fn = boto3.Session(profile_name=profile or None, region_name=region).client("lambda")
        rows = []
        paginator = fn.get_paginator("list_functions")
        for page in paginator.paginate():
            for f in page["Functions"]:
                rows.append({
                    "Function Name": f["FunctionName"],
                    "Runtime": f.get("Runtime", "—"),
                    "Memory (MB)": str(f.get("MemorySize", "—")),
                    "Timeout (s)": str(f.get("Timeout", "—")),
                })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _cloudfront_detail(profile: str | None) -> dict:
    columns = ["Domain / Alias", "Distribution ID", "Status", "Origins"]

    def fetch():
        cf = boto3.Session(profile_name=profile or None).client("cloudfront")
        rows = []
        paginator = cf.get_paginator("list_distributions")
        for page in paginator.paginate():
            for d in page.get("DistributionList", {}).get("Items", []):
                alias = (d.get("Aliases", {}).get("Items") or [d["DomainName"]])[0]
                origins = ", ".join(
                    o["DomainName"]
                    for o in d.get("Origins", {}).get("Items", [])
                )
                rows.append({
                    "Domain / Alias": alias,
                    "Distribution ID": d["Id"],
                    "Status": d.get("Status", "—"),
                    "Origins": origins or "—",
                })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _elb_detail(profile: str | None, region: str) -> dict:
    columns = ["Name", "Type", "State", "DNS Name"]

    def fetch():
        elb = boto3.Session(profile_name=profile or None, region_name=region).client("elbv2")
        rows = []
        paginator = elb.get_paginator("describe_load_balancers")
        for page in paginator.paginate():
            for lb in page["LoadBalancers"]:
                rows.append({
                    "Name": lb["LoadBalancerName"],
                    "Type": lb.get("Type", "—"),
                    "State": lb.get("State", {}).get("Code", "—"),
                    "DNS Name": lb.get("DNSName", "—"),
                })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _elasticache_detail(profile: str | None, region: str) -> dict:
    columns = ["Cluster ID", "Engine", "Node Type", "Status", "Nodes"]

    def fetch():
        ec = boto3.Session(profile_name=profile or None, region_name=region).client("elasticache")
        rows = []
        paginator = ec.get_paginator("describe_cache_clusters")
        for page in paginator.paginate():
            for c in page["CacheClusters"]:
                rows.append({
                    "Cluster ID": c["CacheClusterId"],
                    "Engine": f"{c.get('Engine','')} {c.get('EngineVersion','')}",
                    "Node Type": c.get("CacheNodeType", "—"),
                    "Status": c.get("CacheClusterStatus", "—"),
                    "Nodes": str(c.get("NumCacheNodes", "—")),
                })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _sqs_detail(profile: str | None, region: str) -> dict:
    columns = ["Queue Name", "URL"]

    def fetch():
        sqs = boto3.Session(profile_name=profile or None, region_name=region).client("sqs")
        rows = []
        for url in sqs.list_queues().get("QueueUrls", []):
            name = url.rstrip("/").split("/")[-1]
            rows.append({"Queue Name": name, "URL": url})
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _sns_detail(profile: str | None, region: str) -> dict:
    columns = ["Topic Name", "ARN"]

    def fetch():
        sns = boto3.Session(profile_name=profile or None, region_name=region).client("sns")
        rows = []
        paginator = sns.get_paginator("list_topics")
        for page in paginator.paginate():
            for t in page["Topics"]:
                arn = t["TopicArn"]
                rows.append({"Topic Name": arn.split(":")[-1], "ARN": arn})
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _route53_detail(profile: str | None) -> dict:
    columns = ["Zone Name", "Type", "Zone ID"]

    def fetch():
        r53 = boto3.Session(profile_name=profile or None).client("route53")
        rows = []
        paginator = r53.get_paginator("list_hosted_zones")
        for page in paginator.paginate():
            for z in page["HostedZones"]:
                rows.append({
                    "Zone Name": z["Name"],
                    "Type": "Private" if z.get("Config", {}).get("PrivateZone") else "Public",
                    "Zone ID": z["Id"].split("/")[-1],
                })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _kms_detail(profile: str | None, region: str) -> dict:
    columns = ["Key ID", "Description", "State"]

    def fetch():
        kms = boto3.Session(profile_name=profile or None, region_name=region).client("kms")
        rows = []
        paginator = kms.get_paginator("list_keys")
        for page in paginator.paginate():
            for k in page["Keys"]:
                try:
                    meta = kms.describe_key(KeyId=k["KeyId"])["KeyMetadata"]
                    if meta.get("KeyState") == "Enabled":
                        rows.append({
                            "Key ID": k["KeyId"],
                            "Description": meta.get("Description", "—") or "—",
                            "State": meta.get("KeyState", "—"),
                        })
                except Exception:
                    pass
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _secrets_detail(profile: str | None, region: str) -> dict:
    columns = ["Name", "Description", "Last Changed"]

    def fetch():
        sm = boto3.Session(profile_name=profile or None, region_name=region).client("secretsmanager")
        rows = []
        paginator = sm.get_paginator("list_secrets")
        for page in paginator.paginate():
            for s in page["SecretList"]:
                rows.append({
                    "Name": s["Name"],
                    "Description": s.get("Description", "—") or "—",
                    "Last Changed": str(s.get("LastChangedDate", "—"))[:10],
                })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _codepipeline_detail(profile: str | None, region: str) -> dict:
    columns = ["Pipeline Name", "Created"]

    def fetch():
        cp = boto3.Session(profile_name=profile or None, region_name=region).client("codepipeline")
        rows = []
        for p in cp.list_pipelines().get("pipelines", []):
            rows.append({
                "Pipeline Name": p["name"],
                "Created": str(p.get("created", "—"))[:10],
            })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _codecommit_detail(profile: str | None, region: str) -> dict:
    columns = ["Repository Name", "Description"]

    def fetch():
        cc = boto3.Session(profile_name=profile or None, region_name=region).client("codecommit")
        rows = []
        for r in cc.list_repositories().get("repositories", []):
            rows.append({
                "Repository Name": r["repositoryName"],
                "Description": r.get("repositoryDescription", "—") or "—",
            })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _firehose_detail(profile: str | None, region: str) -> dict:
    columns = ["Stream Name"]

    def fetch():
        fh = boto3.Session(profile_name=profile or None, region_name=region).client("firehose")
        rows = []
        for name in fh.list_delivery_streams().get("DeliveryStreamNames", []):
            rows.append({"Stream Name": name})
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _waf_detail(profile: str | None, region: str) -> dict:
    columns = ["ACL Name", "Scope", "ID"]

    def fetch():
        waf = boto3.Session(profile_name=profile or None, region_name=region).client("wafv2")
        rows = []
        for scope in ("REGIONAL", "CLOUDFRONT"):
            try:
                for acl in waf.list_web_acls(Scope=scope, Limit=100).get("WebACLs", []):
                    rows.append({"ACL Name": acl["Name"], "Scope": scope, "ID": acl["Id"]})
            except Exception:
                pass
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _apigateway_detail(profile: str | None, region: str) -> dict:
    columns = ["API Name", "API ID", "Description"]

    def fetch():
        apigw = boto3.Session(profile_name=profile or None, region_name=region).client("apigateway")
        rows = []
        paginator = apigw.get_paginator("get_rest_apis")
        for page in paginator.paginate():
            for api in page["items"]:
                rows.append({
                    "API Name": api["name"],
                    "API ID": api["id"],
                    "Description": api.get("description", "—") or "—",
                })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _natgw_detail(profile: str | None, region: str) -> dict:
    columns = ["Name", "NAT Gateway ID", "State", "VPC ID"]

    def fetch():
        ec2 = boto3.Session(profile_name=profile or None, region_name=region).client("ec2")
        rows = []
        paginator = ec2.get_paginator("describe_nat_gateways")
        for page in paginator.paginate():
            for gw in page["NatGateways"]:
                name = _tag(gw.get("Tags", []))
                rows.append({
                    "Name": name or "—",
                    "NAT Gateway ID": gw["NatGatewayId"],
                    "State": gw.get("State", "—"),
                    "VPC ID": gw.get("VpcId", "—"),
                })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


def _cloudwatch_detail(profile: str | None, region: str) -> dict:
    columns = ["Alarm Name", "State", "Metric"]

    def fetch():
        cw = boto3.Session(profile_name=profile or None, region_name=region).client("cloudwatch")
        rows = []
        paginator = cw.get_paginator("describe_alarms")
        for page in paginator.paginate():
            for alarm in page["MetricAlarms"]:
                rows.append({
                    "Alarm Name": alarm["AlarmName"],
                    "State": alarm.get("StateValue", "—"),
                    "Metric": alarm.get("MetricName", "—"),
                })
        return rows

    return {"columns": columns, "rows": _safe(fetch) or []}


# ── service detail dispatch ───────────────────────────────────────────────────

def fetch_service_detail(service_name: str, profile: str | None, region: str) -> dict:
    key = service_name.lower()
    if any(k in key for k in ["elastic compute cloud", "ec2"]):
        return _ec2_detail(profile, region)
    if "relational database" in key:
        return _rds_detail(profile, region)
    if any(k in key for k in ["simple storage service", "amazon s3", "s3"]):
        return _s3_detail(profile)
    if "lambda" in key:
        return _lambda_detail(profile, region)
    if "cloudfront" in key:
        return _cloudfront_detail(profile)
    if "elastic load balancing" in key:
        return _elb_detail(profile, region)
    if "elasticache" in key:
        return _elasticache_detail(profile, region)
    if any(k in key for k in ["simple queue service", "sqs"]):
        return _sqs_detail(profile, region)
    if any(k in key for k in ["simple notification service", "sns"]):
        return _sns_detail(profile, region)
    if "route 53" in key:
        return _route53_detail(profile)
    if any(k in key for k in ["key management service", "kms"]):
        return _kms_detail(profile, region)
    if "secrets manager" in key:
        return _secrets_detail(profile, region)
    if "codepipeline" in key:
        return _codepipeline_detail(profile, region)
    if "codecommit" in key:
        return _codecommit_detail(profile, region)
    if any(k in key for k in ["kinesis", "firehose"]):
        return _firehose_detail(profile, region)
    if "waf" in key:
        return _waf_detail(profile, region)
    if "api gateway" in key:
        return _apigateway_detail(profile, region)
    if any(k in key for k in ["virtual private cloud", "vpc", "nat"]):
        return _natgw_detail(profile, region)
    if "cloudwatch" in key:
        return _cloudwatch_detail(profile, region)
    return {"columns": [], "rows": []}
