import React from 'react';
import fs from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BehindTheScenesMiniHud from './BehindTheScenesMiniHud.jsx';
import ColorInterferenceTask from '../tasks/ColorInterferenceTask.jsx';
import GoNoGoTask from '../tasks/GoNoGoTask.jsx';
import VisualSearchTask from '../tasks/VisualSearchTask.jsx';
import PrecisionTargetingTask from '../tasks/PrecisionTargetingTask.jsx';

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

  it('DG-0 defines high-contrast game tokens and compact report media guardrails', () => {
    const css = fs.readFileSync('src/postulation-demo/postulationDemo.css', 'utf8');

    for (const token of [
      '--postulation-game-surface:',
      '--postulation-game-control-bg:',
      '--postulation-game-control-text:',
      '--postulation-game-control-border:',
      '--postulation-game-target:',
      '--postulation-game-distractor:',
      '--postulation-game-focus-ring:',
    ]) {
      expect(css).toContain(token);
    }

    expect(css).toContain('.postulation-demo__game-stage {');
    expect(css).toContain('overflow-x: hidden;');
    expect(css).toContain('@media (max-height: 800px)');
    expect(css).toContain('.postulation-demo__report-hero');
    expect(css).toContain('grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));');
    expect(css).toContain('.postulation-demo__report-screen > *');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr);');
  });

  it('DG-0 gives every current game explicit high-contrast interactive hooks', () => {
    render(<GoNoGoTask active trialCount={1} stimulusMs={5000} />);
    expect(screen.getByRole('button', { name: /Responder|Espera|No responder/i })).toHaveClass('go-nogo-task__response');

    render(<VisualSearchTask active trialCount={1} width={360} height={240} />);
    expect(screen.getByTestId('visual-search-target')).toHaveClass('visual-search-task__item');
    expect(screen.getAllByTestId('visual-search-distractor')[0]).toHaveClass('visual-search-task__item');

    render(<PrecisionTargetingTask active trialCount={1} width={360} height={240} />);
    expect(screen.getByTestId('precision-start-pad')).toHaveClass('precision-targeting-task__start-pad');
    fireEvent.click(screen.getByTestId('precision-start-pad'));
    expect(screen.getByTestId('precision-target')).toHaveClass('precision-targeting-task__target');
  });

  it('DG-0 uses Spanish user-facing report labels instead of mixed English metric labels', () => {
    const reportScreen = fs.readFileSync('src/postulation-demo/PostulationReportScreen.jsx', 'utf8');
    const reportSummary = fs.readFileSync('src/postulation-demo/PostulationReportSummary.js', 'utf8');

    expect(reportScreen).toContain('<dt>{metric.label}</dt>');
    expect(reportSummary).toContain("pushMetric(metrics, 'Ensayos'");
    expect(reportSummary).toContain("pushMetric(metrics, 'Precisión'");
    expect(reportSummary).toContain("pushMetric(metrics, 'Puntaje'");
    expect(reportSummary).toContain("pushMetric(metrics, 'Tiempo'");
    expect(reportSummary).not.toMatch(/Accuracy|mean RT|Search efficiency/);
    expect(reportSummary).toContain("{ label: 'Ensayos correlacionados'");
  });
});
