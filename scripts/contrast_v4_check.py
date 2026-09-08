#!/usr/bin/env python3
"""Contraste WCAG para los pares V4 (referencia new-request.css)."""

def lum(hexs: str) -> float:
    c = hexs.replace("#", "")
    r, g, b = (int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))

    def f(v: float) -> float:
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(fg: str, bg: str) -> float:
    x, y = lum(fg), lum(bg)
    hi, lo = max(x, y), min(x, y)
    return (hi + 0.05) / (lo + 0.05)


pairs = [
    ("icon-ink 65472e / icon-bg dfc5a7 (grafico >=3:1)", "65472e", "dfc5a7"),
    ("badge-ink 765e4d / badge-bg f2ece3 (9px/800 >=4.5:1)", "765e4d", "f2ece3"),
    ("featured text fffaf4 / featured-bg 795638 (>=4.5:1)", "fffaf4", "795638"),
    ("msg-ink 805d3d / co-surface fffaf4 (9px >=4.5:1)", "805d3d", "fffaf4"),
    ("action-ink 75503a / action-bg fff5e8 (12px/800 >=4.5:1)", "75503a", "fff5e8"),
    ("card-ink 3d2b20 / card-bg eee1d0 (>=4.5:1)", "3d2b20", "eee1d0"),
    ("card-ink 3d2b20 / featured-bg e4cdb5 (>=4.5:1)", "3d2b20", "e4cdb5"),
    ("ink-medium 6f503a / card-bg eee1d0 (desc 13px >=4.5:1)", "6f503a", "eee1d0"),
    ("ink-medium 6f503a / featured-bg e4cdb5 (desc >=4.5:1)", "6f503a", "e4cdb5"),
    ("paper-ink 977250 / co-surface fffaf4 (decorativo >=3:1)", "977250", "fffaf4"),
    ("user-msg ink 3d2b20 / user-msg-bg ede2d2 (>=4.5:1)", "3d2b20", "ede2d2"),
    ("h3 card-ink 3d2b20 / preview-doc e3d2bc (n/a, no hay texto sobre preview)", "3d2b20", "e3d2bc"),
]
ok = True
for label, fg, bg in pairs:
    r = ratio(fg, bg)
    mark = "OK" if r >= 3 else "FALLO"
    if r < 3:
        ok = False
    print(f"{mark}  {r:5.2f}:1  {label}")
print("ALL >= 3:1" if ok else "HAY FALLOS")
