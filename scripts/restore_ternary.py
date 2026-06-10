"""Restore the broken ternary in App.jsx."""
path = 'src/App.jsx'
with open(path, 'r') as f:
    content = f.read()

# Find the broken ternary
idx = content.find('{isCameraActive ? (')
if idx < 0:
    print('ternary not found')
    exit(1)

# Find the closing </section> after the Dashboard
# The structure is: {isCameraActive ? (<Dashboard ... />) : <p>...</p>}
# then </section>

# Find pattern: "        ) : <p"
broken_idx = content.find('        ) : <p')
if broken_idx < 0:
    broken_idx = content.find(')} : <p')
if broken_idx < 0:
    # try regex
    import re
    m = re.search(r'\)\s*:\s*<p\s+className="caption">Inicia la cámara', content)
    if m:
        broken_idx = m.start()
if broken_idx < 0:
    print('Could not find broken ternary tail')
    exit(1)

# Find the end of this <p> tag
end_idx = content.find('</section>', broken_idx)
if end_idx < 0:
    print('Could not find closing </section>')
    exit(1)
end_idx += len('</section>')

# Extract the Dashboard part (from ternary start to the broken part)
dashboard_part = content[idx:broken_idx]

# Build correct tail
correct_tail = '''        )} : <p className="caption">Inicia la cámara para ver los gestos detectados por MediaPipe.</p>}
      </section>'''

# Replace from ternary start to closing </section>
content = content[:idx] + dashboard_part + correct_tail + content[end_idx:]

with open(path, 'w') as f:
    f.write(content)
print('Ternary restored')