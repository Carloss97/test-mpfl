#!/usr/bin/env python3
"""Estado y apagado de instancias Lambda KRUMM (sin tocar gateway).
Uso: lambda_ctl.py status | down
"""
import json, os, sys, urllib.request

HOME = os.path.expanduser("~")
API = "https://cloud.lambdalabs.com/api/v1"
NAME_TAG = "hermes-krumm-qwen"

env = {}
for line in open(os.path.join(HOME, ".hermes/.env")):
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.strip().split("=", 1)
        env[k] = v
KEY = env.get("LAMBDA_API_KEY", "")
if not KEY:
    print("Falta LAMBDA_API_KEY"); sys.exit(1)

def req(method, path, data=None):
    headers = {"Authorization": f"Bearer {KEY}", "User-Agent": "curl/8.0",
               "Accept": "application/json"}
    body = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode()
    r = urllib.request.Request(f"{API}/{path}", data=body, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.load(resp)

d = req("GET", "instances")
insts = [i for i in d.get("data", [])]
cmd = sys.argv[1] if len(sys.argv) > 1 else "status"

if cmd == "status":
    if not insts:
        print("Sin instancias activas/booting.")
    for i in insts:
        print(i["id"], i["instance_type"]["name"], i["status"], i.get("ip"), i.get("name"))
    sys.exit(0)

if cmd == "down":
    targets = [i for i in insts if i.get("name") == NAME_TAG and i.get("status") in ("active", "booting")]
    if not targets:
        print("Nada que apagar.")
        sys.exit(0)
    ids = [i["id"] for i in targets]
    resp = req("POST", "instance-operations/terminate", {"instance_ids": ids})
    print("Terminadas:", ids, json.dumps(resp.get("data", {}))[:200])
    st = os.path.join(HOME, ".hermes/gpu_state.json")
    if os.path.exists(st):
        os.remove(st)
        print("gpu_state.json eliminado")
    sys.exit(0)

print("comando desconocido"); sys.exit(2)
