"""Patch App.jsx with lighting adapter and adaptive calibration."""
import re

path = 'src/App.jsx'

with open(path, 'r') as f:
    content = f.read()

# 1. Add imports
content = content.replace(
    "import { buildCalibrationProfile } from './telemetry/microgestureFeatures.js';",
    "import { buildCalibrationProfile } from './telemetry/microgestureFeatures.js';\nimport { adaptiveCalibrationSamples, estimateLightingQuality, canCalibrate } from './telemetry/lightingAdapter.js';"
)

# 2. Replace startCalibration with adaptive version
old = """const startCalibration = useCallback(() => {
    setIsCalibrating(true);
    setCalibrationProfile(null);
    calibrationTimerRef.current = setTimeout(() => {
      const samples = faceSamplesRef.current;
      if (samples.length >= 10) {
        const start = sessionStartRef.current ?? samples[0]?.timestamp ?? performance.now();
        const profile = buildCalibrationProfile(samples, { from: start, to: start + CALIBRATION_DURATION_MS });
        setCalibrationProfile(profile);
        setAUBaseline(profile, computeEnhancedAUs(samples));
      }
      setIsCalibrating(false);
    }, CALIBRATION_DURATION_MS);
  }, []);"""

new = """const startCalibration = useCallback(() => {
    setIsCalibrating(true);
    setCalibrationProfile(null);
    const light = estimateLightingQuality(faceSamplesRef.current);
    const adapt = adaptiveCalibrationSamples(light);
    const duration = adapt.durationMs;
    calibrationTimerRef.current = setTimeout(() => {
      const samples = faceSamplesRef.current;
      const check = canCalibrate(samples, { minSamples: adapt.minSamples });
      if (!check.eligible) {
        setCalibrationProfile({ eligible: false, caveats: [check.reason], usableSampleCount: samples.length });
        setIsCalibrating(false);
        return;
      }
      const start = sessionStartRef.current ?? samples[0]?.timestamp ?? performance.now();
      const profile = buildCalibrationProfile(samples, { from: start, to: start + duration });
      setCalibrationProfile(profile);
      if (profile.eligible) setAUBaseline(profile, computeEnhancedAUs(samples));
      setIsCalibrating(false);
    }, duration);
  }, []);"""

if old in content:
    content = content.replace(old, new)
    print('Calibration block replaced')
else:
    print('WARNING: Calibration block not found!')
    # Try to find it
    idx = content.find('startCalibration = useCallback')
    if idx > 0:
        snippet = content[idx:idx+500]
        print(f'Found at {idx}:')
        print(snippet[:200])

with open(path, 'w') as f:
    f.write(content)
print('Done')