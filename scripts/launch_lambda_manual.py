#!/usr/bin/env python3
"""Manual Lambda launcher: minimal launch, driver install/reboot, then vLLM.

This is intentionally separate from the cloud-init launcher. The known-good
workflow from 2026-09-14 launched without user_data, because Lambda's cloud-init
ordering could leave H100 SXM CUDA uninitialized even when nvidia-smi worked.
"""
import json
import os
import socket
import subprocess
import sys
import time
import urllib.request

HOME = os.path.expanduser("~")
STATE = os.path.join(HOME, ".hermes", "gpu_state.json")
API = "https://cloud.lambdalabs.com/api/v1"
REGION = "us-southeast-1"
FS_NAME = "qwen-storage"
MODEL_PATH = "/lambda/nfs/qwen-storage/models/Qwen3.8-27B-FP8"
INSTANCE_TYPE = "gpu_2x_h100_sxm5"
SSH_KEY = os.path.join(HOME, ".ssh", "lambda_key")
SSH_KEY_NAME = "wsl_hermes_lambda"
NAME = "hermes-krumm-qwen"
IMAGE = "vllm/vllm-openai:v0.28.0-cu129"
LAUNCHED_ID = None

_orig_getaddrinfo = socket.getaddrinfo
def _ipv4(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4


def env_value(name):
    for line in open(os.path.join(HOME, ".hermes", ".env"), encoding="utf-8"):
        if line.startswith(name + "="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return ""

KEY = env_value("LAMBDA_API_KEY")
if not KEY:
    raise SystemExit("Falta LAMBDA_API_KEY")


def api(method, path, payload=None):
    headers = {"Authorization": f"Bearer {KEY}", "User-Agent": "curl/8.0", "Accept": "application/json"}
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode()
    req = urllib.request.Request(f"{API}/{path}", data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=40) as response:
        return json.load(response)


def ssh(ip, command, timeout=90, check=False):
    args = ["ssh", "-i", SSH_KEY, "-o", "IdentitiesOnly=yes",
            "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=10",
            "-o", "ServerAliveInterval=15", f"ubuntu@{ip}", command]
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=check)


def wait_ssh(ip, timeout=300):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if ssh(ip, "true", timeout=15).returncode == 0:
                return
        except (OSError, subprocess.SubprocessError):
            pass
        time.sleep(10)
    raise RuntimeError("SSH no volvió después del reboot")


def current():
    for item in api("GET", "instances").get("data", []):
        if item.get("status") not in ("active", "booting"):
            continue
        # Match by canonical name OR mounted filesystem: a stale differently
        # named instance with qwen-storage must block a second billable launch.
        filesystems = item.get("file_system_names") or [x.get("name") for x in item.get("file_systems", [])]
        if item.get("name") == NAME or FS_NAME in filesystems:
            return item
    return None


def ensure_capacity():
    catalog = api("GET", "instance-types").get("data", {})
    info = catalog.get(INSTANCE_TYPE, {}) if isinstance(catalog, dict) else {}
    regions = info.get("regions_with_capacity_available")
    if regions is not None and REGION not in regions:
        raise RuntimeError(f"Sin capacidad {INSTANCE_TYPE} en {REGION}; no se lanza instancia")


def terminate_failed_launch():
    global LAUNCHED_ID
    if not LAUNCHED_ID:
        return
    try:
        api("POST", "instance-operations/terminate", {"instance_ids": [LAUNCHED_ID]})
        print(f"Instancia {LAUNCHED_ID} terminada tras fallo de bootstrap", file=sys.stderr)
    except Exception as exc:
        print(f"No se pudo terminar instancia fallida {LAUNCHED_ID}: {exc}", file=sys.stderr)
    finally:
        try:
            os.remove(STATE)
        except FileNotFoundError:
            pass


def main():
    item = current()
    if item:
        ip = item.get("ip") or ""
        json.dump({"instance_id": item["id"], "ip": ip}, open(STATE, "w"), indent=2)
        print(f"Ya hay instancia: id={item['id']} status={item['status']} ip={ip}")
        return

    ensure_capacity()
    print(f"Lanzando manualmente {INSTANCE_TYPE} en {REGION} sin user_data...")
    response = api("POST", "instance-operations/launch", {
        "region_name": REGION,
        "instance_type_name": INSTANCE_TYPE,
        "ssh_key_names": [SSH_KEY_NAME],
        "file_system_names": [FS_NAME],
        "quantity": 1,
        "name": NAME,
    })
    instance_id = response["data"]["instance_ids"][0]
    global LAUNCHED_ID
    LAUNCHED_ID = instance_id
    print(f"Instancia lanzada: {instance_id}")
    ip = ""
    status = "booting"
    for _ in range(60):
        time.sleep(10)
        detail = api("GET", f"instances/{instance_id}")["data"]
        ip, status = detail.get("ip") or "", detail.get("status", "")
        if ip:
            break
    if not ip:
        raise RuntimeError(f"No se obtuvo IP; status={status}")
    json.dump({"instance_id": instance_id, "ip": ip}, open(STATE, "w"), indent=2)
    print(f"IP={ip}; esperando SSH")
    wait_ssh(ip)

    print("Instalando driver propietario y reiniciando antes de iniciar vLLM")
    driver = "sudo DEBIAN_FRONTEND=noninteractive apt-get update -y && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nvidia-driver-580-server && sudo update-initramfs -u && sudo depmod -a && sudo reboot"
    ssh(ip, driver, timeout=600)
    wait_ssh(ip, timeout=360)

    print("Verificando CUDA/NVIDIA y arrancando vLLM")
    start = f'''set -e
nvidia-smi --query-gpu=name,driver_version --format=csv,noheader
sudo nvidia-ctk runtime configure --runtime=docker >/dev/null 2>&1 || true
sudo systemctl daemon-reload
sudo systemctl restart docker
sleep 8
sudo docker rm -f vllm-qwen >/dev/null 2>&1 || true
sudo docker pull {IMAGE}
sudo docker run -d --name vllm-qwen --gpus all --network host --ipc host \\
  --ulimit memlock=-1:-1 --restart unless-stopped \\
  -v {MODEL_PATH}:/model \\
  {IMAGE} /model \\
  --served-model-name qwen-model \\
  --tensor-parallel-size 2 \\
  --max-model-len 1048576 \\
  --hf-overrides '{{"text_config":{{"rope_parameters":{{"rope_type":"yarn","factor":4.0,"original_max_position_embeddings":262144,"mrope_interleaved":true,"mrope_section":[11,11,10],"partial_rotary_factor":0.25,"rope_theta":10000000.0}}}}}}' \\
  --gpu-memory-utilization 0.94 --kv-cache-dtype fp8 \\
  --enable-prefix-caching --enable-chunked-prefill \\
  --max-num-batched-tokens 32768 --max-num-seqs 2 \\
  --enable-auto-tool-choice --tool-call-parser qwen3_xml \\
  --trust-remote-code --port 8000 --host 0.0.0.0
'''
    result = ssh(ip, start, timeout=900)
    if result.returncode:
        print(result.stdout[-2000:])
        print(result.stderr[-2000:], file=sys.stderr)
        raise RuntimeError("No se pudo iniciar vLLM")
    print("vLLM lanzado; el wrapper debe abrir el túnel y validar /health")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        terminate_failed_launch()
        raise SystemExit(f"ERROR: {exc}")
