import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import LandingPage from './LandingPage.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';

function renderLanding() {
  return render(
    <LanguageProvider>
      <LandingPage />
    </LanguageProvider>,
  );
}

// Aislamiento entre tests: el LanguageProvider persiste la lengua elegida en
// localStorage ('krumm-lang') y <html lang>. Sin limpiarlo, el test i18n EN
// (que cambia a 'en') contamina a los tests siguientes, que renderizan la
// página en EN y fallan sus aserciones de copy ES (detectado en CI 2026-09-10,
// run 34427600666: el test de accesibilidad leía 'en' del test anterior).
beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* jsdom sin storage accesible */
  }
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = '';
  }
});

describe('LandingPage (design de marca v2, 2026-09-07)', () => {
  describe('Hero de referencia', () => {
    it('muestra H1 de 3 líneas con accent dorado, subheadline y eyebrow (working copy §8)', () => {
      renderLanding();
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('El talento no se declara.');
      const accent = h1.querySelector('.landing__accent');
      expect(accent).toHaveTextContent('Se demuestra.');
      expect(screen.getByText('EDGE-AI · GAMIFICACIÓN · PRIVACY BY DESIGN')).toBeInTheDocument();
      expect(screen.getByText(/telemetría conductual procesada con Edge-AI directamente en el navegador/i)).toBeInTheDocument();
    });

    it('mantiene los CTAs actuales del hero: /candidato + ancla cómo funciona (V5 cutover)', () => {
      renderLanding();
      expect(screen.getByRole('link', { name: 'Acceso candidatos' })).toHaveAttribute('href', '/candidato');
      expect(screen.getByRole('link', { name: /Ver cómo funciona/i })).toHaveAttribute('href', '#como-funciona');
    });

    it('muestra la proof row con los 3 chips de valor', () => {
      renderLanding();
      expect(screen.getByText('EDGE-AI EN EL NAVEGADOR')).toBeInTheDocument();
      expect(screen.getByText('PRIVACY BY DESIGN')).toBeInTheDocument();
      expect(screen.getByText('EVALUACIÓN CONDUCTUAL INMERSIVA')).toBeInTheDocument();
    });

    it('usa la foto de marca del hero (no mock de reporte)', () => {
      renderLanding();
      const photo = document.querySelector('.landing__hero-photo');
      expect(photo).not.toBeNull();
      expect(photo).toHaveAttribute('src', '/assets/hero-photo.jpg');
      // El mock de reporte y las stat cards flotantes fueron retirados en la referencia v2
      // (docs/plans/2026-09-07-landing-brand-port-plan.md); el hallazgo H4.6 de oclusión
      // queda superado por este port (ver commit 9062ccf y docs/qa/h46-visual-audit/).
      expect(document.querySelector('.landing__mock')).toBeNull();
      expect(document.querySelector('.landing__stat')).toBeNull();
    });
  });

  describe('Nav (jerarquía: brand + nav + actions con "Iniciar sesión" + idioma)', () => {
    it('logo de marca, links de sección, Iniciar sesión en header-actions → accesos, CTA demo solo en cierre y toggle', () => {
      renderLanding();
      const logo = screen.getByRole('link', { name: /KRUMM - Inicio/i });
      expect(logo).toHaveAttribute('href', '/');
      expect(logo.querySelector('img')).toHaveAttribute('src', '/assets/krumm-logo-borderless-no-text.png');
      expect(screen.getByRole('link', { name: 'Producto' })).toHaveAttribute('href', '#producto');
      expect(screen.getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '#como-funciona');
      expect(screen.getByRole('link', { name: 'Tecnología' })).toHaveAttribute('href', '#tecnologia');
      expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '#contacto');
      const login = screen.getByRole('link', { name: 'Iniciar sesión' });
      expect(login).toHaveAttribute('href', '#accesos');
      // Fix 2026-09-11: el login ocupa el slot donde estaba "Solicitar demo".
      expect(login.closest('.landing__header-actions')).not.toBeNull();
      // "Solicitar demo" eliminado de la topbar; queda solo el del cierre HABLEMOS.
      const demoLinks = screen.getAllByRole('link', { name: 'Solicitar demo' });
      expect(demoLinks).toHaveLength(1);
      for (const link of demoLinks) {
        expect(link).toHaveAttribute('href', 'mailto:carlossaldivia@krumm.cl');
      }
      expect(screen.getByRole('group', { name: /Idioma/i })).toBeInTheDocument();
    });

    it('menú móvil: botón con aria-expanded y toggle de .landing__nav--open', () => {
      // La referencia oculta el hamburger en desktop (display:none, se muestra
      // ≤1150px). Nota de entorno: jsdom + dom-accessibility-api devuelven nombre
      // vacío para este botón (quirk con aria-label aquí; en navegadores reales el
      // nombre accesible es "Abrir menú"). Se consulta por selector estable y se
      // aserta el aria-label directamente.
      const { container } = renderLanding();
      const button = container.querySelector('.landing__menu-button');
      expect(button).not.toBeNull();
      expect(button).toHaveAttribute('aria-label', 'Abrir menú');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-controls', 'main-nav');
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('navigation', { name: /Navegación principal/i })).toHaveClass('landing__nav--open');
    });

    it('hamburguesa con 3 paths SVG animables (clases --1/--2/--3) para el morph X (2026-09-11)', () => {
      const { container } = renderLanding();
      const button = container.querySelector('.landing__menu-button');
      expect(button).not.toBeNull();
      for (const i of [1, 2, 3]) {
        expect(button.querySelector(`.landing__menu-line--${i}`)).not.toBeNull();
      }
      expect(button.querySelectorAll('svg path')).toHaveLength(3);
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
      expect(screen.getByText(/batería de juegos gamificados/i)).toBeInTheDocument();
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

    it('Accesos: 2 cards de referencia con CTAs a /empresa/acceso y /candidato (V5 cutover)', () => {
      renderLanding();
      expect(document.getElementById('accesos')).not.toBeNull();
      expect(screen.getByRole('heading', { name: '¿Dónde quieres ingresar?' })).toBeInTheDocument();
      expect(screen.getByText('Accede a tu espacio KRUMM.')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Portal para empresas' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Portal para candidatos' })).toBeInTheDocument();
      const empresa = screen.getByRole('link', { name: /Ingresar como empresa/i });
      expect(empresa).toHaveAttribute('href', '/empresa/acceso');
      const candidato = screen.getByRole('link', { name: /Ingresar como candidato/i });
      expect(candidato).toHaveAttribute('href', '/candidato');
      expect(screen.getByRole('link', { name: /Volver a KRUMM/i })).toHaveAttribute('href', '/');
    });

    it('Cierre HABLEMOS + contacto actual: H2 de referencia, CTA demo, ambos emails y nota', () => {
      renderLanding();
      const section = document.getElementById('contacto');
      expect(section).not.toBeNull();
      expect(screen.getByText('HABLEMOS')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Descubre qué puede medir KRUMM en tu organización.' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'contacto@krumm.cl' })).toHaveAttribute('href', 'mailto:contacto@krumm.cl');
      expect(screen.getByText(/La cámara y las señales biométricas son opcionales y no se utilizan para decisiones finales/i)).toBeInTheDocument();
    });

    it('Footer arena: © KRUMM + tagline de referencia', () => {
      renderLanding();
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveTextContent(/© \d{4} KRUMM/);
      expect(footer).toHaveTextContent('Tecnología para la evaluación de talento');
    });
  });

  describe('i18n EN', () => {
    it('cambia el idioma a EN sin romper estructura (copy de la referencia)', () => {
      renderLanding();
      fireEvent.click(screen.getByRole('button', { name: 'EN' }));
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent("Talent isn't claimed.");
      expect(h1.querySelector('.landing__accent')).toHaveTextContent("It's proven.");
      expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '#accesos');
      expect(screen.getByRole('heading', { name: 'Where do you want to sign in?' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Discover what KRUMM can measure in your organization.' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign in as a company' })).toHaveAttribute('href', '/empresa/acceso');
      expect(screen.getByRole('contentinfo')).toHaveTextContent('Technology for talent assessment');
    });
  });

  describe('Accesibilidad', () => {
    it('un solo h1, nav etiquelada y skip link', () => {
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
      // Strip comments first to avoid false positives on hex in comments
      const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
      const hex = cssNoComments.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      expect(hex).toEqual([]);
      expect(cssNoComments).not.toMatch(/\b(rgb|rgba|hsl|hsla)\s*\(/);
      const tokenUses = (cssNoComments.match(/var\(--k-[a-z0-9-]+\)/gi) ?? []).length;
      expect(tokenUses).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Accesibilidad visual (WCAG AA) — gaps del review prod 09-10', () => {
    // proof-row 26d73476fd06cccb2: revisarlo sobre hero oscuro => hero está en --k-bg-dark (38271d)
    it('proof-row: la declaración ganadora es un token AA sobre --k-bg-dark (v1.0)', () => {
      const css = readFileSync(path.resolve(process.cwd(), 'src/landing/landing.css'), 'utf8');
      const m = css.match(/\.landing__proof-row\s*\{[^}]*color:\s*(var\(--[a-z0-9-]+\))/i);
      expect(m).not.toBeNull();
      expect(m[1]).toBe('var(--k-proof-ink)');
    });

    it('kickers en superficie oscura: el modifier --dark usa --k-accent-sand (AA 7.3:1) — no terracota brand (~3.4:1, falla AA)', () => {
      const css = readFileSync(path.resolve(process.cwd(), 'src/landing/landing.css'), 'utf8');
      // una regla con el modifier --dark debe override a arena/gold (no terracota brand)
      expect(css).toMatch(/\.landing__kicker--dark\s*\{[\s\S]*?color:\s*var\(--k-accent-sand\)/);
    });

    it('card paragraph: texto siempre es un token con AA ≥4.5 sobre --k-card-cream y --k-card-sand', () => {
      const css = readFileSync(path.resolve(process.cwd(), 'src/landing/landing.css'), 'utf8');
      const m = css.match(/\.landing__acceso-card\s+p\s*\{[^}]*color:\s*(var\(--[a-z0-9-]+\))/);
      expect(m).not.toBeNull();
      // El token elegido debe pasar AA 4.5+ sobre el más claro (cream) y el más oscuro (sand).
      expect(m[1]).toBe('var(--k-ink-medium)');
    });

    it('favicon: SVG existente con un atributo data-favicon-retina + mask simplificado', () => {
      const icon = readFileSync(path.resolve(process.cwd(), 'public/favicon.svg'), 'utf8');
      // Debe llevar una capa que haga legible la silueta en 16px (sin detalles internos pequeños).
      expect(icon).toMatch(/data-retina|data-favicon-retina/i);
    });
  });

  describe('Contraste (regresión bug prod 2026-09-10)', () => {
    // Bug detectado en prod (review 2026-09-10, krumm.cl): la regla base
    // `.landing a { color: inherit }` (especificidad 0,1,1) PISA el color de
    // `.landing__cta--gold` (0,1,0) → el CTA gold del hero ("Acceso
    // candidatos") renderizaba `var(--k-text-cream)` hereditario sobre el
    // gradiente oro (contraste medido en prod 1.35–2.5:1, fail AA).
    // Fix: selector doble `.landing__cta.landing__cta--gold` (0,2,0) gana la
    // cascada con `var(--k-btn-gold-ink)` (tinta oscura #3d2b20, ~8.7:1 sobre
    // la parada más clara del gradiente).
    // Nota jsdom: getComputedStyle NO resuelve var() (devuelve la declaración
    // ganadora) pero SÍ resuelve `inherit` — por eso se aserta la declaración:
    // pre-fix el hero devuelve 'var(--k-text-cream)' (inherit resuelto hasta
    // .landing__hero); post-fix 'var(--k-btn-gold-ink)'. La verificación rgb
    // final (navegador real) queda en el smoke Playwright / review prod.
    const tokensCss = readFileSync(path.resolve(process.cwd(), 'src/styles/krumm-tokens.css'), 'utf8');
    const landingCss = readFileSync(path.resolve(process.cwd(), 'src/landing/landing.css'), 'utf8');

    function injectLandingStyles() {
      const style = document.createElement('style');
      style.textContent = `${tokensCss}\n${landingCss}`;
      document.head.appendChild(style);
      return () => style.remove();
    }

    it('CTA gold del hero: declaración ganadora = --k-btn-gold-ink (no crema heredado)', () => {
      const remove = injectLandingStyles();
      renderLanding();
      const cta = document.querySelector('.landing__hero-buttons .landing__cta--gold');
      expect(cta).not.toBeNull();
      expect(getComputedStyle(cta).color).toBe('var(--k-btn-gold-ink)');
      remove();
    });

    it('login pill en header-actions (ex slot "Solicitar demo", fix 2026-09-11): declaración ganadora = --k-btn-gold-ink', () => {
      const remove = injectLandingStyles();
      renderLanding();
      const login = document.querySelector('.landing__header-actions .landing__nav-login--cta');
      expect(login).not.toBeNull();
      expect(getComputedStyle(login).color).toBe('var(--k-btn-gold-ink)');
      remove();
    });

    it('login pill: declaración ganadora = --k-btn-gold-ink (regresión cascada .landing a { color: inherit })', () => {
      const remove = injectLandingStyles();
      renderLanding();
      const login = document.querySelector('.landing__nav-login--cta');
      expect(login).not.toBeNull();
      expect(getComputedStyle(login).color).toBe('var(--k-btn-gold-ink)');
      remove();
    });

    it('skip link: crema (no espresso heredado de .landing) — invisible al focus pre-fix', () => {
      const remove = injectLandingStyles();
      renderLanding();
      const skip = document.querySelector('.landing__skip');
      expect(skip).not.toBeNull();
      // Pre-fix: getComputedStyle devolvía var(--k-ink-espresso) (inherit de .landing)
      // sobre el bg dark-deep del propio link → ~1.5:1 al hacer focus.
      expect(getComputedStyle(skip).color).toBe('var(--k-text-cream)');
      remove();
    });
  });

  describe('Estilo de marca v2 (tokens + estructura CSS)', () => {
    const css = readFileSync(path.resolve(process.cwd(), 'src/landing/landing.css'), 'utf8');

    it('hero con grid lines, gradiente espresso + glow dorado y foto con shadow de marca', () => {
      expect(css).toContain('.landing__hero-grid');
      expect(css).toContain('var(--k-hero-glow-gold)');
      expect(css).toContain('var(--k-shadow-hero-photo)');
      expect(css).toContain('var(--k-grid-cell)');
    });

    it('H1 Archivo 900 con tracking hero y accent dorado', () => {
      expect(css).toContain('var(--k-font-display)');
      expect(css).toContain('var(--k-tracking-hero)');
      expect(css).toContain('var(--k-size-hero-brand)');
      expect(css).toMatch(/\.landing__accent\s*{[^}]*var\(--k-gold\)/);
    });

    it('botones gold gradient + outline ghost (referencia)', () => {
      // Selector doble (0,2,0): gana la cascada contra `.landing a { color: inherit }`.
      expect(css).toMatch(/\.landing__cta\.landing__cta--gold\s*{[^}]*var\(--k-btn-gold-from\)/);
      expect(css).toContain('var(--k-btn-gold-to)');
      expect(css).toContain('var(--k-btn-ghost-bg)');
    });

    it('transiciones suaves (2026-09-11): dropdown móvil fade/slide, underline nav animado, scroll-margin y reduced-motion', () => {
      // Dropdown móvil: estado cerrado con opacity/visibility/transform (no display:none).
      expect(css).toMatch(/@media \(max-width: 1150px\)[\s\S]*?\.landing__nav\s*\{[\s\S]*?visibility:\s*hidden[\s\S]*?transform:\s*translateY\(-10px\)/);
      // Estado abierto: visible + en reposo.
      expect(css).toMatch(/\.landing__nav--open\s*\{[\s\S]*?opacity:\s*1[\s\S]*?visibility:\s*visible/);
      // Subrayado que crece desde la izquierda.
      expect(css).toMatch(/\.landing__nav a::after\s*\{[\s\S]*?transform:\s*scaleX\(0\)/);
      expect(css).toMatch(/\.landing__nav a:hover::after[\s\S]*?transform:\s*scaleX\(1\)/);
      // Easing moderno (cubic-bezier) y respeto a prefers-reduced-motion.
      expect(css).toContain('cubic-bezier(');
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
      // Anclas bajo la topbar overlay.
      expect(css).toMatch(/\.landing__section\s*\{[\s\S]*?scroll-margin-top:\s*190px/);
    });
  });

  describe('Scroll suave (2026-09-11)', () => {
    it('monta con scroll-behavior: smooth y lo limpia al desmontar (scoped a la ruta)', () => {
      const { unmount } = renderLanding();
      expect(document.documentElement.style.scrollBehavior).toBe('smooth');
      unmount();
      expect(document.documentElement.style.scrollBehavior).toBe('');
    });
  });
});
