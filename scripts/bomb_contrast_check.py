#!/usr/bin/env python3
"""WCAG contrast check for the BOMB world palette (bomb.css, B2)."""


def srgb_channel(c8):
    c = c8 / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hexcolor):
    h = hexcolor.lstrip('#')
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return 0.2126 * srgb_channel(r) + 0.7152 * srgb_channel(g) + 0.0722 * srgb_channel(b)


def contrast(fg, bg):
    l1, l2 = luminance(fg), luminance(bg)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


PAIRS = [
    ("--bomb-text #eaf1f7 / --bomb-bg #10151b", "eaf1f7", "10151b"),
    ("--bomb-text #eaf1f7 / panel #1d2731", "eaf1f7", "1d2731"),
    ("--bomb-text-dim #9fb0be / panel #1d2731", "9fb0be", "1d2731"),
    ("--bomb-text-dim #9fb0be / card #141b23", "9fb0be", "141b23"),
    ("--bomb-amber #ffb454 / #0d1319", "ffb454", "0d1319"),
    ("--bomb-green #53d97e / card #141b23", "53d97e", "141b23"),
    ("--bomb-red #ff6252 / #0d1319", "ff6252", "0d1319"),
    ("CTA ink #241a08 / amber #ffb454", "241a08", "ffb454"),
    ("switch ON state #53d97e / #141b23", "53d97e", "141b23"),
    ("hold ink #3d2f05 / yellow #ffd23f", "3d2f05", "ffd23f"),
    # B3: pares de las fases (intro/encoding/delay/resultados)
    ("delay text #9fb0be / delay bg #05080b", "9fb0be", "05080b"),
    ("intro transición #eaf1f7 / card #141b23", "eaf1f7", "141b23"),
    ("intro tag NUEVA REGLA #ffb454 / card #141b23", "ffb454", "141b23"),
    ("intro tag MODELO B #ff6252 / card #141b23", "ff6252", "141b23"),
    ("fail title #ff6252 / card #141b23", "ff6252", "141b23"),
    ("countdown text #eaf1f7 / overlay ~#0a0f14", "eaf1f7", "0a0f14"),
    ("status penalty #ff6252 / statusbar ~#0d1319", "ff6252", "0d1319"),
]

for label, fg, bg in PAIRS:
    ratio = contrast(fg, bg)
    verdict = "AA OK" if ratio >= 4.5 else ("AA large OK" if ratio >= 3 else "FAIL")
    print(f"{ratio:5.2f}:1  {verdict:14s} {label}")
