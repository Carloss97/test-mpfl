import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LandingPage from './LandingPage.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';

function renderLanding() {
  return render(
    <LanguageProvider>
      <LandingPage />
    </LanguageProvider>,
  );
}

describe('LandingPage (H4.2 rebuild con design system)', () => {
  describe('Hero de referencia', () => {
    it('muestra H1 bicolor, subheadline y badges de la referencia (working copy §8)', () => {
      renderLanding();
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('El talento no se declara.');
      const accent = h1.querySelector('.landing__accent');
      expect(accent).toHaveTextContent('Se demuestra.');
      expect(screen.getByText('EDGE-AI · GAMIFICACIÓN · PRIVACY BY DESIGN')).toBeInTheDocument();
      expect(screen.getByText(/telemetría conductual procesada con Edge-AI directamente en el navegador/i)).toBeInTheDocument();
    });

    it('mantiene los CTAs actuales del hero: /postulaciones + ancla cómo funciona', () => {
      renderLanding();
      expect(screen.getByRole('link', { name: 'Acceso candidatos' })).toHaveAttribute('href', '/postulaciones');
      expect(screen.getByRole('link', { name: /Ver cómo funciona/i })).toHaveAttribute('href', '#como-funciona');
    });

    it('muestra los 3 trust badges y las 2 cards flotantes navy', () => {
      renderLanding();
      expect(screen.getByText('EDGE-AI EN EL NAVEGADOR')).toBeInTheDocument();
      expect(screen.getByText('PRIVACY BY DESIGN')).toBeInTheDocument();
      expect(screen.getByText('EVALUACIÓN CONDUCTUAL INMERSIVA')).toBeInTheDocument();
      expect(screen.getByText('Datos en tu dispositivo')).toBeInTheDocument();
      expect(screen.getByText('−60%')).toBeInTheDocument();
    });
  });

  describe('Nav (jerarquía de referencia)', () => {
    it('logo, 4 links de sección, Iniciar sesión → accesos, CTA demo y toggle', () => {
      renderLanding();
      const logo = screen.getByRole('link', { name: /KRUMM - Inicio/i });
      expect(logo).toHaveAttribute('href', '/');
      expect(logo.querySelector('img')).toHaveAttribute('src', '/logo.svg');
      expect(screen.getByRole('link', { name: 'Producto' })).toHaveAttribute('href', '#producto');
      expect(screen.getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '#como-funciona');
      expect(screen.getByRole('link', { name: 'Tecnología' })).toHaveAttribute('href', '#tecnologia');
      expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '#contacto');
      expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '#accesos');
      const demoLinks = screen.getAllByRole('link', { name: 'Solicitar demo' });
      expect(demoLinks.length).toBeGreaterThanOrEqual(2);
      for (const link of demoLinks) {
        expect(link).toHaveAttribute('href', 'mailto:carlossaldivia@krumm.cl');
      }
      expect(screen.getByRole('group', { name: /Idioma/i })).toBeInTheDocument();
    });
  });

  describe('Secciones y contenido existente preservado', () => {
    it('01 · Cómo funciona: kicker, H2 de referencia y 4 pasos actuales', () => {
      renderLanding();
      const section = document.getElementById('como-funciona');
      expect(section).not.toBeNull();
      expect(screen.getByText('01 · CÓMO FUNCIONA')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Evalúa lo que un CV no puede mostrar.' })).toBeInTheDocument();
      expect(screen.getByText(/experiencias gamificadas capaces de capturar cómo piensa, decide y actúa/i)).toBeInTheDocument();
      const steps = section.querySelector('ol');
      expect(steps).not.toBeNull();
      expect(steps.querySelectorAll('li')).toHaveLength(4);
      expect(screen.getByText(/batería de 5 juegos gamificados/i)).toBeInTheDocument();
    });

    it('02 · Tecnología: kicker y H2 de referencia (fórmula con +)', () => {
      renderLanding();
      expect(document.getElementById('tecnologia')).not.toBeNull();
      expect(screen.getByText('02 · TECNOLOGÍA')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Edge-AI + gamificación + psicometría.' })).toBeInTheDocument();
      expect(screen.getByText(/información conductual de alto valor sin depender de datos biométricos almacenados en la nube/i)).toBeInTheDocument();
    });

    it('Producto: las 4 cards actuales de "Qué hacemos" con su sub', () => {
      renderLanding();
      expect(document.getElementById('producto')).not.toBeNull();
      expect(screen.getByRole('heading', { name: 'Qué hacemos' })).toBeInTheDocument();
      expect(screen.getByText(/privacidad por diseño y revisión humana al centro/i)).toBeInTheDocument();
      for (const title of ['Evaluación basada en juegos', 'Privacidad by design', 'Revisión humana al centro', 'Rigor técnico']) {
        expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      }
      expect(screen.getByText(/Nada de “score confiable” sin evidencia ni contexto/i)).toBeInTheDocument();
    });

    it('Accesos: 2 cards de referencia con CTAs a /reclutador y /postulaciones', () => {
      renderLanding();
      expect(document.getElementById('accesos')).not.toBeNull();
      expect(screen.getByRole('heading', { name: '¿Dónde quieres ingresar?' })).toBeInTheDocument();
      expect(screen.getByText('Accede a tu espacio KRUMM.')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Portal para empresas' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Portal para candidatos' })).toBeInTheDocument();
      const empresa = screen.getByRole('link', { name: /Ingresar como empresa/i });
      expect(empresa).toHaveAttribute('href', '/reclutador');
      const candidato = screen.getByRole('link', { name: /Ingresar como candidato/i });
      expect(candidato).toHaveAttribute('href', '/postulaciones');
      expect(screen.getByRole('link', { name: /Volver a KRUMM/i })).toHaveAttribute('href', '/');
    });

    it('Cierre HABLEMOS + contacto actual: H2 de referencia, CTA demo, ambos emails y nota', () => {
      renderLanding();
      const section = document.getElementById('contacto');
      expect(section).not.toBeNull();
      expect(screen.getByText('HABLEMOS')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Descubre qué puede medir KRUMM en tu organización.' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'contacto@krumm.cl' })).toHaveAttribute('href', 'mailto:contacto@krumm.cl');
      expect(screen.getByRole('link', { name: 'carlossaldivia@krumm.cl' })).toHaveAttribute('href', 'mailto:carlossaldivia@krumm.cl');
      expect(screen.getByText(/La cámara y las señales biométricas son opcionales y no se utilizan para decisiones finales/i)).toBeInTheDocument();
    });

    it('Footer crema: © KRUMM + tagline de referencia', () => {
      renderLanding();
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveTextContent(/© \d{4} KRUMM/);
      expect(footer).toHaveTextContent('Tecnología para la evaluación de talento');
    });
  });

  describe('i18n EN', () => {
    it('cambia el idioma a EN sin romper estructura', () => {
      renderLanding();
      fireEvent.click(screen.getByRole('button', { name: 'EN' }));
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Talent is not declared.');
      expect(h1.querySelector('.landing__accent')).toHaveTextContent('It is demonstrated.');
      expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '#accesos');
      expect(screen.getByRole('heading', { name: 'Where do you want to sign in?' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Discover what KRUMM can measure in your organization.' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign in as a company' })).toHaveAttribute('href', '/reclutador');
      expect(screen.getByRole('contentinfo')).toHaveTextContent('Technology for talent assessment');
    });
  });

  describe('Accesibilidad', () => {
    it('un solo h1, nav etiquetada y skip link', () => {
      renderLanding();
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('navigation', { name: /Navegación principal/i })).toBeInTheDocument();
      const skip = screen.getByRole('link', { name: /Saltar al contenido/i });
      expect(skip).toHaveAttribute('href', '#contenido');
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Régimen de tokens (sin estilos ad-hoc)', () => {
    it('landing.css no declara colores hardcodeados (hex/rgb/hsl): todo vía var(--k-*)', () => {
      const css = readFileSync(path.resolve(process.cwd(), 'src/landing/landing.css'), 'utf8');
      const hex = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      expect(hex).toEqual([]);
      expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla)\s*\(/);
      const tokenUses = (css.match(/var\(--k-[a-z0-9-]+\)/gi) ?? []).length;
      expect(tokenUses).toBeGreaterThanOrEqual(40);
    });
  });
});