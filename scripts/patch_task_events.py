"""Patch App.jsx: connect taskEvents to edge AI inference pipeline."""

path = 'src/App.jsx'
with open(path, 'r') as f:
    content = f.read()

# 1. Update edgeAIResult useMemo to include taskEvents
old_ai = """const edgeAIResult = useMemo(() => {
    const samples = faceSamplesRef.current;
    if (!samples.length || samples.length < 2) return null;
    return runEdgeAIInference({
      faceSamples: samples, pointerSamples: [], taskEvents: [],
      calibrationProfile,
      runtime: { delegate: faceWorker.delegate ?? 'CPU' },
    });
  }, [latestFaceSample, calibrationProfile, faceWorker.delegate]);"""

new_ai = """const edgeAIResult = useMemo(() => {
    const samples = faceSamplesRef.current;
    if (!samples.length || samples.length < 2) return null;
    return runEdgeAIInference({
      faceSamples: samples,
      pointerSamples: [],
      taskEvents: taskEventsRef.current,
      calibrationProfile,
      runtime: { delegate: faceWorker.delegate ?? 'CPU' },
    });
  }, [latestFaceSample, calibrationProfile, faceWorker.delegate, taskEventsRef.current.length]);"""

content = content.replace(old_ai, new_ai)

# 2. Update buildSessionPayload to include taskEvents
old_payload = """return buildFusionPayload({
      runId: crypto.randomUUID?.() ?? `${now}`,
      startedAt: start, endedAt: now,
      faceSamples: samples, calibrationProfile,
      runtime: { userAgent: navigator.userAgent, platform: navigator.platform },
    });"""

new_payload = """return buildFusionPayload({
      runId: crypto.randomUUID?.() ?? `${now}`,
      startedAt: start, endedAt: now,
      faceSamples: samples,
      pointerSamples: [],
      taskEvents: taskEventsRef.current,
      calibrationProfile,
      runtime: { userAgent: navigator.userAgent, platform: navigator.platform },
    });"""

content = content.replace(old_payload, new_payload)

# 3. Also update the stopCamera payload
old_stop = """const payload = buildFusionPayload({
        runId: crypto.randomUUID?.() ?? `${now}`,
        startedAt: start, endedAt: now,
        faceSamples: samples, calibrationProfile,
        runtime: { userAgent: navigator.userAgent, platform: navigator.platform },
      });"""

new_stop = """const payload = buildFusionPayload({
        runId: crypto.randomUUID?.() ?? `${now}`,
        startedAt: start, endedAt: now,
        faceSamples: samples,
        pointerSamples: [],
        taskEvents: taskEventsRef.current,
        calibrationProfile,
        runtime: { userAgent: navigator.userAgent, platform: navigator.platform },
      });"""

content = content.replace(old_stop, new_stop)

with open(path, 'w') as f:
    f.write(content)

print('Task events connected to edge AI pipeline')