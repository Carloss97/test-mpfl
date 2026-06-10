import { describe, expect, it } from 'vitest';
import { buildCameraConstraints, formatCameraDeviceLabel, normalizeVideoInputDevices } from './cameraDevices.js';

describe('cameraDevices', () => {
  it('builds default user-facing constraints when no device is selected', () => {
    expect(buildCameraConstraints('')).toEqual({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      },
      audio: false,
    });
  });

  it('uses exact deviceId when the user selects a specific camera', () => {
    expect(buildCameraConstraints('camera-2')).toEqual({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        deviceId: { exact: 'camera-2' },
      },
      audio: false,
    });
  });

  it('normalizes only videoinput devices and provides labels for hidden-permission devices', () => {
    const devices = normalizeVideoInputDevices([
      { kind: 'audioinput', deviceId: 'mic', label: 'Mic' },
      { kind: 'videoinput', deviceId: 'cam-a', label: '' },
      { kind: 'videoinput', deviceId: 'cam-b', label: 'Logitech C920' },
    ]);

    expect(devices).toEqual([
      { deviceId: 'cam-a', label: 'Cámara 1' },
      { deviceId: 'cam-b', label: 'Logitech C920' },
    ]);
    expect(formatCameraDeviceLabel({ deviceId: 'x', label: '' }, 2)).toBe('Cámara 3');
  });
});
