"""Patch App.jsx to integrate Dashboard component - dynamic search version."""
import re

path = 'src/App.jsx'

with open(path, 'r') as f:
    content = f.read()

# 1. Add import for Dashboard (only if not present)
if "import Dashboard" not in content:
    content = content.replace(
        "import FaceMeshOverlay from './telemetry/FaceMeshOverlay.jsx';",
        "import FaceMeshOverlay from './telemetry/FaceMeshOverlay.jsx';\nimport Dashboard from './components/Dashboard.jsx';"
    )

# 2. Find and replace the grid-two section
# Strategy: find the <section className="grid-two"> ... </section> that contains the camera panel
pattern = r'(<section className="grid-two">.*?</section>)'
matches = list(re.finditer(pattern, content, re.DOTALL))

if not matches:
    print("ERROR: Could not find grid-two section")
    sys.exit(1)

# Take the FIRST match (the camera + metrics panel)
old_block = matches[0].group(1)

new_block = """{isCameraActive ? (
        <Dashboard
          videoRef={videoRef} isCameraActive={isCameraActive} showMesh={showMesh} setShowMesh={setShowMesh}
          telemetry={telemetry} faceWorker={faceWorker} statusClassName={statusClassName} lastQuality={lastQuality}
          calibrationProfile={calibrationProfile} calStatusLabel={calStatusLabel}
          insightItems={insightItems} auEntries={auEntries} activeAUCount={activeAUCount}
          edgeAIResult={edgeAIResult} edgeChannels={edgeChannels} edgeConfidence={edgeConfidence} edgeComposite={edgeComposite}
          latestLandmarks={latestLandmarks} auRegionSummary={auRegionSummary}
          DEVICE_CONFIG={DEVICE_CONFIG}
        />
      ) : (
        <section className="grid-two">
          <article className="panel">
            <div className="panel-heading"><h2>1. Cámara y señal</h2></div>
            <div className="camera-container"><video ref={videoRef} className="camera" muted playsInline aria-label="Vista previa local de cámara" /></div>
            <p className="caption">Inicia la cámara para comenzar la telemetría.</p>
          </article>
          <article className="panel">
            <p className="caption">Inicia la camara para ver indicadores de microgestos.</p>
          </article>
        </section>
      )}"""

content = content.replace(old_block, new_block, 1)

with open(path, 'w') as f:
    f.write(content)

print(f'Dashboard integrated. Replaced block of {len(old_block)} chars')