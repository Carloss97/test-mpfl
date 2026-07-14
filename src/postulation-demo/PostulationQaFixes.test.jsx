import React from 'react';
import fs from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BehindTheScenesMiniHud from './BehindTheScenesMiniHud.jsx';
import ColorInterferenceTask from '../tasks/ColorInterferenceTask.jsx';

describe('Postulation QA visual fixes', () => {
  it('uses human-readable HUD progress and a simplified local-processing drawer', () => {
    render(<BehindTheScenesMiniHud snapshot={{ camera: 'ok', face: 'ok', signal: 'ok', events: 44, report: 'pending' }} />);

    expect(screen.getByText(/Procesos listos 4 de 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Reporte: se generará al finalizar/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ver qué pasa detrás/i }));

    expect(screen.getByText(/Procesamiento local en navegador/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin video, frames ni rutas reconstructivas/i)).toBeInTheDocument();
    expect(screen.getByText(/Detalle técnico/i)).toBeInTheDocument();
  });

  it('adds high-contrast camera selector and responsive HUD CSS guardrails', () => {
    const css = fs.readFileSync('src/postulation-demo/postulationDemo.css', 'utf8');

    expect(css).toContain('.postulation-demo__device-label select');
    expect(css).toContain('border: 1.5px solid rgba(49, 46, 129, 0.45);');
    expect(css).toContain('color: var(--postulation-ink);');
    expect(css).toContain('box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);');
    expect(css).toContain('@media (max-width: 1180px), (max-height: 820px)');
    expect(css).toContain('position: static;');
    expect(css).toContain('max-height: 42dvh;');
  });

  it('renders color interference choices with explicit active option styling hooks', () => {
    render(<ColorInterferenceTask active trialCount={1} />);

    const buttons = screen.getAllByRole('button', { name: /Rojo|Azul|Verde|Amarillo/i });
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      expect(button).toHaveClass('color-interference-task__option');
    }
  });
});
