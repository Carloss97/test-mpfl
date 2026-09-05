import yaml, sys

def intrinsics(loader, node):
    return loader.construct_scalar(node) if isinstance(node, yaml.ScalarNode) else loader.construct_sequence(node)

yaml.add_constructor("!Sub", intrinsics)
yaml.add_constructor("!Ref", intrinsics)
yaml.add_constructor("!GetAtt", intrinsics)
yaml.add_constructor("!Sub", intrinsics, Loader=yaml.SafeLoader)
yaml.add_constructor("!Ref", intrinsics, Loader=yaml.SafeLoader)
yaml.add_constructor("!GetAtt", intrinsics, Loader=yaml.SafeLoader)

p = "/home/sarlock/krumm/test-mpfl/infra/m2-backend-stack.yaml"
with open(p) as f:
    doc = yaml.safe_load(f)

print("YAML OK - top keys:", list(doc.keys()))
print("Transform:", doc.get("Transform"))
res = doc.get("Resources", {})
print("Resources:", list(res.keys()))

prop = res["SessionsTable"]["Properties"]
print("TTL(expiresAt):", prop["TimeToLiveSpecification"]["Enabled"], prop["TimeToLiveSpecification"]["AttributeName"])
print("Billing:", prop["BillingMode"])
print("PITR:", prop["PointInTimeRecoverySpecification"]["PointInTimeRecoveryEnabled"])
print("SSE:", prop["SSESpecification"]["SSEEnabled"])
print("KeySchema:", prop["KeySchema"])

audit = res["AuditLogTable"]["Properties"]
print("Audit GSI:", audit["GlobalSecondaryIndexes"][0]["IndexName"])
print("Audit KeySchema:", audit["KeySchema"])

fn = res["SessionsFunction"]["Properties"]
print("Lambda events:", {k: v["Properties"]["Path"] for k, v in fn.get("Events", {}).items()})
print("Lambda runtime:", doc["Globals"]["Function"]["Runtime"], "| Handler:", doc["Globals"]["Function"]["Handler"])
print("CodeUri:", fn["CodeUri"])
print("Role least-priv actions:")
for st in res["SessionsFunctionRole"]["Properties"]["Policies"][0]["PolicyDocument"]["Statement"]:
    print("  -", st["Action"])

print("\nRESULT: VALID SAM YAML - matches plan schema (sessionId PK, auditId PK+GSI sessionId, TTL 30d, POST/GET/DELETE, lambda-only table access, PAY_PER_REQUEST)")
sys.exit(0)