#!/usr/bin/env python3
"""Termina la instancia Lambda activa KRUMM y limpia gpu_state.json."""
import json, os, sys, time, urllib.request

HOME = os.path.expanduser("~")
STATE = os.path.join(HOME, ".hermes/gpu_state.json")
API = "https://cloud.lambdalabs.com/api/v1"

env = {}
for line in open(os.path.join(HOME, ".hermes/.env")):
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.strip().split("=", 1)
        env[k] = v
KEY = env.get("LAMBDA_API_KEY", "")
if not KEY:
    print("Falta LAMBDA_API_KEY"); sys.exit(1)

def req(method, path, data=None):
    url = f"{API}/{path}"
    headers = {"Authorization": f"Bearer {KEY}", "User-Agent": "curl/8.0", "Accept": "application/json"}
    body = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode()
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.load(resp)

# list instances before
print("== instancias ANTES ==")
for i in req("GET", "instances").get("data", []):
    print(f"  {i['name']} id={i['id']} status={i['status']} ip={i.get('ip')}")

inst_id = sys.argv[1] if len(sys.argv) > 1 else None
if not inst_id:
    # derive from state file
    inst_id = json.load(open(STATE)).get("instance_id")
print(f"\nTerminando instancia {inst_id}...")
try:
    resp = req("POST", "instance-operations/terminate", {"instance_ids": [inst_id]})
    print("OK:", json.dumps(resp))
except Exception as e:
    print("ERROR:", e); sys.exit(1)

# kill stale tunnels and clear state
os.system('pkill -f "ubuntu@" 2>/dev/null; true')
if os.path.exists(STATE):
    os.remove(STATE); print("gpu_state.json eliminado")

# verify
time.sleep(3)
print("\n== instancias DESPUES ==")
still = [i for i in req("GET", "instances").get("data", []) if i.get("status") in ("active", "booting")]
if still:
    for i in still: print(f"  AUN ACTIVA: {i['name']} id={i['id']} status={i['status']}")
    print("WARN: aún hay instancias activas")
else:
    print("  Ninguna instancia activa. GPÚ apagada correctamente.")