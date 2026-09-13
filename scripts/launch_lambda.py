#!/usr/bin/env python3
"""Lanza la instancia Lambda 2xH100 KRUMM (replica gpu.sh up sin reiniciar gateway).

Fix automático del driver (2026-09-03): Lambda provisiona el driver Open Kernel
Module (nvidia-kernel-source-580-server-open) que NO inicializa CUDA en GPU SXM
(Error 802). Estrategia ROBUSTA (no destructiva):

  - Primer boot (user_data): instala el driver PROPIETARIO (nvidia-driver-580-server,
    que REEMPLAZA el open sin dkms remove), regenera initramfs, y registra un
    systemd one-shot service que hace UN reboot tras el arranque completo.
  - Segundo boot (tras reboot): el driver propietario ya está listo; un @reboot cron
    lanza vLLM (idempotente).

NUNCA usar `dkms remove` (borra módulos y deja la instancia sin driver al rebootar).

IMPORTANTE (guard __main__, 2026-09-04): el bloque de lanzamiento está bajo
`if __name__ == "__main__"` para que importar el módulo (p.ej. `import launch_lambda`
para reusar req/current) NO dispare un launch accidental. Si necesitas reusar
req/current, importa el módulo (inofensivo); el launch solo ocurre al correrlo
como script.

Uso: python3 launch_lambda.py  ->  imprime ip/id y escribe ~/.hermes/gpu_state.json
"""
import json, os, sys, time, urllib.request

HOME = os.path.expanduser("~")
STATE = os.path.join(HOME, ".hermes/gpu_state.json")
API = "https://cloud.lambdalabs.com/api/v1"
REGION = "us-southeast-1"
FS_NAME = "qwen-storage"
MODEL_FS_PATH = "/lambda/nfs/qwen-storage/models/Qwen3.8-27B-FP8"
INSTANCE_TYPE = "gpu_2x_h100_sxm5"
SSH_KEY_NAME = "wsl_hermes_lambda"
NAME_TAG = "hermes-krumm-qwen"
VLLM_IMAGE = "vllm/vllm-openai:v0.28.0-cu129"  # CUDA 12.9 (compatible con driver 580)

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
    headers = {
        "Authorization": f"Bearer {KEY}",
        "User-Agent": "curl/8.0",
        "Accept": "application/json",
    }
    body = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode()
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.load(resp)

def current():
    d = req("GET", "instances")
    for i in d.get("data", []):
        if i.get("status") in ("active", "booting") and i.get("name") == NAME_TAG:
            return i
    return None


def main():
    # evitar doble instancia (pitfall para dup billing)
    inst = current()
    if inst:
        ip = inst.get("ip") or ""
        print(f"Ya hay instancia activa: id={inst['id']} status={inst['status']} ip={ip}")
        json.dump({"instance_id": inst["id"], "ip": ip}, open(STATE, "w"))
        print(f"gpu_state.json actualizado"); sys.exit(0)

    # user_data (primer boot de cloud-init). NO hace reboot dentro del provisioning:
    # Lambda/cloud-init terminan la instancia si se corta el arranque durante
    # user_data (verificado 2026-09-04: reboot dentro de user_data -> "terminated").
    #   1. apt-get install nvidia-driver-580-server (reemplaza open -> propietario)
    #   2. update-initramfs + depmod (módulo propietario listo en initramfs)
    #   3. escribir krumm-vllm.sh (lanza vLLM idempotente)
    #   4. registrar krumm-vllm.service (enabled, arranca SOLO si existe /var/lib/krumm/driver-done)
    #   5. escribir marker /var/lib/krumm/provisioning-done (se crea al FINAL, señal de cloud-init completo)
    # NO reboot aquí. El reboot lo dispara launch_lambda.py (vía SSH) DESPUÉS de que
    # cloud-init complete, estando la instancia "active" -> no dispara terminación.
    # Tras el reboot, el user_data ya corrió y krumm-vllm.service ve driver-done -> lanza vLLM.
    HF_OVERRIDES_JSON = (
        '{"text_config":{"rope_parameters":{"rope_type":"yarn","factor":4.0,'
        '"original_max_position_embeddings":262144,"mrope_interleaved":true,'
        '"mrope_section":[11,11,10],"partial_rotary_factor":0.25,'
        '"rope_theta":10000000.0}}}'
    )

    user_data = f'''#!/bin/bash
set -x
exec > /var/log/krumm-bootstrap.log 2>&1 || true

echo "== [KRUMM] primer boot: instalando driver propietario 580-server =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y || true
# Reemplazo limpio (NO dkms remove): apt-get sube/instala el paquete propietario
# sobre el Open; el módulo 580-server reemplaza a 580-server-open en disco.
apt-get install -y nvidia-driver-580-server || true
update-initramfs -u || true
depmod -a || true

echo "== [KRUMM] escribiendo /usr/local/bin/krumm-vllm.sh =="
cat > /usr/local/bin/krumm-vllm.sh <<'KRUMM_EOF'
#!/bin/bash
set -x
sleep 5
# Configurar runtime nvidia SOLO si aún no está en daemon.json (evita reiniciar docker a cada loop)
if ! grep -q '"nvidia"' /etc/docker/daemon.json 2>/dev/null; then
  nvidia-ctk runtime configure --runtime=docker >/dev/null 2>&1 || true
  systemctl daemon-reload || true
  systemctl restart docker || true
  sleep 8
fi
docker rm -f vllm-qwen 2>/dev/null || true
# Pull explícito (idempotente; si ya está, no hace nada) — NO reinicia docker aquí.
docker pull {VLLM_IMAGE} || true
docker run -d --name vllm-qwen --gpus all --network host --ipc host \
  --ulimit memlock=-1:-1 --restart unless-stopped \
  -e VLLM_ATTENTION_BACKEND=FLASHINFER \
  -v {MODEL_FS_PATH}:/model \
  {VLLM_IMAGE} /model \
  --served-model-name qwen-model \
  --tensor-parallel-size 2 \
  --max-model-len 1048576 \
  --hf-overrides '{HF_OVERRIDES_JSON}' \
  --gpu-memory-utilization 0.94 --kv-cache-dtype fp8 \
  --enable-prefix-caching --enable-chunked-prefill \
  --max-num-batched-tokens 32768 --max-num-seqs 2 \
  --enable-auto-tool-choice --tool-call-parser qwen3_xml \
  --trust-remote-code --port 8000 --host 0.0.0.0
KRUMM_EOF
chmod +x /usr/local/bin/krumm-vllm.sh

echo "== [KRUMM] registrando krumm-vllm.service (no cron) =="
cat > /etc/systemd/system/krumm-vllm.service <<'SERVICE_EOF'
[Unit]
Description=KRUMM vLLM launcher
After=local-fs.target network.target docker.service
Requires=docker.service
# Solo arranca tras el reboot post-provisioning (cuando el driver propietario está cargado)
ConditionPathExists=/var/lib/krumm/driver-done

[Service]
Type=simple
ExecStart=/usr/local/bin/krumm-vllm.sh
Restart=on-failure
RestartSec=30s
RemainAfterExit=no

[Install]
WantedBy=multi-user.target
SERVICE_EOF
systemctl daemon-reload
systemctl enable krumm-vllm.service || true

echo "== [KRUMM] marcando provisioning completo (cloud-init termina AQUÍ, SIN reboot) =="
mkdir -p /var/lib/krumm && touch /var/lib/krumm/provisioning-done
echo "(user_data completo; el reboot lo dispara launch_lambda.py por SSH post-provisioning)"
'''

    payload = {
        "region_name": REGION,
        "instance_type_name": INSTANCE_TYPE,
        "ssh_key_names": [SSH_KEY_NAME],
        "file_system_names": [FS_NAME],
        "quantity": 1,
        "name": NAME_TAG,
        "user_data": user_data,
    }

    print(f"Lanzando {INSTANCE_TYPE} en {REGION} con {FS_NAME}...")
    resp = req("POST", "instance-operations/launch", payload)
    inst_id = resp["data"]["instance_ids"][0]
    print(f"Instancia lanzada: {inst_id} — esperando IP...")

    ip = ""
    for _ in range(60):
        time.sleep(10)
        d = req("GET", f"instances/{inst_id}")["data"]
        ip = d.get("ip") or ""
        st = d.get("status")
        if ip:
            break
    print(f"status={st} ip={ip or 'pendiente'}")

    if not ip:
        print("ERROR: no se obtuvo IP"); sys.exit(1)

    json.dump({"instance_id": inst_id, "ip": ip}, open(STATE, "w"))
    print(f"gpu_state.json -> id={inst_id} ip={ip}")

    # Fase post-provisioning (del HOST, no user_data): NO dispara terminación
    import subprocess
    SSH = ["ssh", "-i", os.path.join(HOME, ".ssh/lambda_key"),
           "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=accept-new",
           "-o", "ConnectTimeout=10", "-o", "ServerAliveInterval=15"]

    def run(cmd):
        return subprocess.run(SSH + [f"ubuntu@{ip}", cmd],
                              capture_output=True, text=True, timeout=60)

    print("Esperando cloud-init complete (marker provisioning-done)...")
    for _ in range(40):  # hasta ~8 min (driver tarda unos min)
        try:
            r = run("test -f /var/lib/krumm/provisioning-done && echo DONE")
            if "DONE" in r.stdout:
                print(f"  cloud-init completo (SSH up + marker). driver: "
                      f"{run('nvidia-smi --query-gpu=driver_version --format=csv,noheader | head -1').stdout.strip()}")
                break
        except Exception:
            pass
        time.sleep(12)
    else:
        print("ERROR: timeout esperando provisioning-done"); sys.exit(1)

    print("Reiniciando post-provisioning (reboot por SSH, la instancia ya está active)...")
    run("sudo touch /var/lib/krumm/driver-done && sudo reboot")
    print("Reboot disparado. Esperando que la instancia vuelva con vLLM auto-start...")


if __name__ == "__main__":
    main()