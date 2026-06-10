export function buildCameraConstraints(deviceId = '') {
  const trimmedDeviceId = String(deviceId ?? '').trim();
  return {
    video: trimmedDeviceId
      ? {
        width: { ideal: 640 },
        height: { ideal: 480 },
        deviceId: { exact: trimmedDeviceId },
      }
      : {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      },
    audio: false,
  };
}

export function formatCameraDeviceLabel(device, index) {
  const label = String(device?.label ?? '').trim();
  return label || `Cámara ${index + 1}`;
}

export function normalizeVideoInputDevices(devices = []) {
  const seen = new Set();
  return [...devices]
    .filter((device) => device?.kind === 'videoinput')
    .filter((device) => {
      const id = String(device.deviceId ?? '');
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((device, index) => ({
      deviceId: String(device.deviceId ?? ''),
      label: formatCameraDeviceLabel(device, index),
    }));
}
