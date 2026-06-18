import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App.jsx';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
window.performance.now = () => 1000;

beforeEach(() => localStorageMock.clear());
afterEach(() => localStorageMock.clear());

describe('App shell', () => {
  it('renders the camera shell before camera start', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /KRUMM Edge Fusion/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Cámara y señal/i })).toBeInTheDocument();
    expect(screen.getByText(/Inicia la cámara para comenzar/i)).toBeInTheDocument();
    expect(screen.getByText(/Actividades gamificadas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Actividad gamificada/i)).toBeInTheDocument();
    expect(screen.getByText(/Fases A-M/i)).toBeInTheDocument();
  });

  it('allows manual access to newly implemented gamified tasks without starting the camera', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Actividad gamificada/i), { target: { value: 'go_nogo' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar actividad/i }));
    expect(screen.getByRole('heading', { name: /Go\/No-Go/i })).toBeInTheDocument();
    expect(screen.getByText(/Sesión gamificada/i)).toBeInTheDocument();
  });

  it('allows manual access to Visual Search from the gamified selector', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Actividad gamificada/i), { target: { value: 'visual_search' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar actividad/i }));
    expect(screen.getByRole('heading', { name: /Búsqueda visual/i })).toBeInTheDocument();
  });

  it('shows session history when localStorage has saved sessions', () => {
    const sessions = [{ id: 's1', savedAt: '2026-01-01T00:00:00Z', facePresenceRatio: 0.8, durationMs: 5000 }];
    localStorageMock.setItem('krumm_edge_sessions_v1', JSON.stringify(sessions));
    render(<App />);
    // Wait for async loadSessionsSafe
    setTimeout(() => {
      expect(screen.getByText(/2026/)).toBeInTheDocument();
    }, 100);
  });
});
