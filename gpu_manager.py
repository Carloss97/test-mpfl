#!/usr/bin/env python3
import time, requests, subprocess, os

LAMBDA_API_KEY = os.environ.get("LAMBDA_API_KEY", "secret_hx100_cafacf0a9e67423fa222103412d52610.HShxEaBqTvXP8LKiGodalIgv4OESldYT")
SSH_KEY_NAME = "wsl_hermes_h100"
FILE_SYSTEM_NAME = "qwen3-827B"
REGION = "us-southeast-1"

# Selecciona el perfil:
# Perfil 1: "gpu_2x_h100_sxm5" con Qwen3.8-27B
# Perfil 2: "gpu_4x_h100_sxm5" con Qwen3.8-Flash-Next 125B
INSTANCE_TYPE = "gpu_2x_h100_sxm5"  # o "gpu_4x_h100_sxm5"
MODEL_PATH = "/cloud-fs/models/Qwen3.8-27B-FP8"  # o "/cloud-fs/models/Qwen3.8-Flash-Next"
TP_SIZE = 2 if "2x" in INSTANCE_TYPE else 4

HEADERS = {"Authorization": f"Bearer {LAMBDA_API_KEY}"}

USER_DATA_SCRIPT = f"""#!/usr/bin/env bash
set -euo pipefail
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

docker run -d \\
  --name vllm-qwen \\
  --gpus all \\
  --network host \\
  --ipc host \\
  --ulimit memlock=-1:-1 \\
  --restart unless-stopped \\
  -v {MODEL_PATH}:/model \\
  vllm/vllm-openai:latest \\
  /model \\
  --served-model-name qwen-model \\
  --tensor-parallel-size {TP_SIZE} \\
  --max-model-len 1048576 \\
  --hf-overrides '{{"text_config":{{"rope_parameters":{{"rope_type":"yarn","factor":4.0,"original_max_position_embeddings":262144,"mrope_interleaved":true,"mrope_section":[11,11,10],"partial_rotary_factor":0.25,"rope_theta":10000000.0}}}}}}' \\
  --gpu-memory-utilization 0.94 \\
  --kv-cache-dtype fp8 \\
  --enable-prefix-caching \\
  --enable-chunked-prefill \\
  --max-num-batched-tokens 32768 \\
  --max-num-seqs 2 \\
  --enable-auto-tool-choice \\
  --tool-call-parser qwen3_xml \\
  --trust-remote-code \\
  --port 8000 \\
  --host 0.0.0.0
"""

def launch_server():
    print(f"[1/3] Aprovisionando {INSTANCE_TYPE} en Lambda Labs...")
    payload = {
        "instance_type_name": INSTANCE_TYPE,
        "region_name": REGION,
        "ssh_key_names": [SSH_KEY_NAME],
        "file_system_names": [FILE_SYSTEM_NAME],
        "quantity": 1,
        "user_data": USER_DATA_SCRIPT
    }
    res = requests.post("https://cloud.lambdalabs.com/api/v1/instance-operations/launch", json=payload, headers=HEADERS)
    if res.status_code != 200:
        print(f"Error: {res.text}")
        return None
    instance_id = res.json()["data"]["instance_ids"][0]
    print(f"-> Instancia {instance_id} lanzada. Esperando IP pública...")

    while True:
        time.sleep(10)
        data = requests.get(f"https://cloud.lambdalabs.com/api/v1/instances/{instance_id}", headers=HEADERS).json()["data"]
        status = data.get("status")
        ip = data.get("ip")
        print(f"   Estado: {status}...")
        if status == "active" and ip:
            print(f"[2/3] Servidor activo en IP: {ip}")
            return ip

def update_ssh_and_tunnel(ip):
    print("[3/3] Abriendo túnel SSH hacia 127.0.0.1:8000...")
    subprocess.run(["pkill", "-f", "ssh.*8000:127.0.0.1:8000"], stderr=subprocess.DEVNULL)
    cmd = f"ssh -N -f -o StrictHostKeyChecking=no -L 8000:127.0.0.1:8000 -i ~/.ssh/lambda_key ubuntu@{ip}"
    subprocess.run(cmd, shell=True)
    print("-> ¡Túnel establecido exitosamente!")
    print("-> VS Code y WSL listos para operar.")

if __name__ == "__main__":
    ip = launch_server()
    if ip:
        update_ssh_and_tunnel(ip)