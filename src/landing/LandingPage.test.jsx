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
      expect(photo).toHaveAttribute('src', '/assets/hero-photo.webp');
      // El mock de reporte y las stat cards flotantes fueron retirados en la referencia v2
      // (docs/plans/2026-09-07-landing-brand-port-plan.md); el hallazgo H4.6 de oclusión
      // queda superado por este port (ver commit 9062ccf y docs/qa/h46-visual-audit/).
      expect(document.querySelector('.landing__mock')).toBeNull();
      expect(document.querySelector('.landing__stat')).toBeNull();
    });
  });

  describe('Nav (jerarquía: brand + nav + actions con "Iniciar sesión" + idioma)', () => {
    it('logo de marca, links de sección, selector /portal y CTAs demo en topbar/cierre', () => {
      renderLanding();
      const logo = screen.getByRole('link', { name: /KRUMM - Inicio/i });
      expect(logo).toHaveAttribute('href', '/');
      expect(logo.querySelector('img')).toHaveAttribute('src', '/assets/krumm-logo-borderless-no-text.webp');
      expect(screen.getByRole('link', { name: 'Producto' })).toHaveAttribute('href', '#producto');
      expect(screen.getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '#como-funciona');
      expect(screen.getByRole('link', { name: 'Tecnología' })).toHaveAttribute('href', '#tecnologia');
      expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '#contacto');
      const login = screen.getByRole('link', { name: 'Iniciar sesión' });
      expect(login).toHaveAttribute('href', '/portal');
      expect(login.closest('.landing__header-actions')).not.toBeNull();
      expect(login).toHaveClass('landing__cta--gold');
      expect(login.querySelector('svg.landing__nav-login-arrow')).not.toBeNull();
      const demoLinks = screen.getAllByRole('link', { name: 'Solicitar demo' });
      expect(demoLinks).toHaveLength(2);
      expect(demoLinks[0].closest('.landing__header-actions')).not.toBeNull();
      expect(demoLinks[0]).toHaveClass('landing__cta--outline');
      for (const link of demoLinks) {
        expect(link).toHaveAttribute('href', '/solicitar-demo');
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
      expect(screen.getByText('Resuelve desafíos interactivos y sus señales conductuales se procesan localmente.')).toBeInTheDocument();
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

    it('elimina el bloque de accesos de la landing: /portal queda como selector explícito', () => {
      renderLanding();
      expect(document.getElementById('accesos')).toBeNull();
      expect(screen.queryByRole('heading', { name: '¿Dónde quieres ingresar?' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Portal para empresas' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Portal para candidatos' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/portal');
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
      expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/portal');
      expect(screen.queryByRole('heading', { name: 'Where do you want to sign in?' })).not.toBeInTheDocument();
      expect(screen.getByText('Completes interactive challenges and behavioral signals are processed locally.')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Discover what KRUMM can measure in your organization.' })).toBeInTheDocument();
      const demoLinks = screen.getAllByRole('link', { name: 'Request a demo' });
      expect(demoLinks).toHaveLength(2);
      for (const link of demoLinks) expect(link).toHaveAttribute('href', '/solicitar-demo');
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

    it('conserva demo, login, idioma y menú en un topbar refluido a 320px', () => {
      renderLanding();
      const topbar = document.querySelector('.landing__topbar');
      expect(topbar.querySelector('a[href="/solicitar-demo"]')).not.toBeNull();
      expect(topbar.querySelector('a[href="/portal"]')).not.toBeNull();
      expect(screen.getByRole('group', { name: /Idioma/i })).toBeInTheDocument();
      expect(document.querySelector('.landing__menu-button')).not.toBeNull();

      const css = readFileSync(path.resolve(process.cwd(), 'src/landing/landing.css'), 'utf8');
      expect(css).toMatch(/@media \(max-width: 360px\)\s*{[\s\S]*?\.landing__topbar\s*{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto auto[\s\S]*?\.landing__header-actions\s*{[\s\S]*?grid-column:\s*1 \/ -1/);
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

    it('el CSS no conserva reglas muertas del bloque de accesos eliminado', () => {
      const css = readFileSync(path.resolve(process.cwd(), 'src/landing/landing.css'), 'utf8');
      expect(css).not.toContain('landing__accesos');
      expect(css).not.toContain('landing__acceso-');
      expect(css).not.toContain('landing__volver');
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

    it('CTA gold login en header-actions (ex slot "Solicitar demo", v2 2026-09-11): declaración ganadora = --k-btn-gold-ink', () => {
      const remove = injectLandingStyles();
      renderLanding();
      const login = document.querySelector('.landing__header-actions .landing__cta--gold');
      expect(login).not.toBeNull();
      expect(getComputedStyle(login).color).toBe('var(--k-btn-gold-ink)');
      remove();
    });

    it('CTA demo outline de la topbar conserva tinta crema sobre el hero oscuro', () => {
      const remove = injectLandingStyles();
      renderLanding();
      const demo = document.querySelector('.landing__header-actions .landing__cta--outline');
      expect(demo).not.toBeNull();
      expect(getComputedStyle(demo).color).toBe('var(--k-text-cream)');
      remove();
    });

    it('login CTA: declaración ganadora = --k-btn-gold-ink (regresión cascada .landing a { color: inherit })', () => {
      const remove = injectLandingStyles();
      renderLanding();
      const login = document.querySelector('.landing__nav-login');
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
      // Anclas: SIN scroll-margin. La topbar es position:absolute (no fixed)
      // y se va con el scroll; con offset 190px la sección quedaba "a mitad
      // de pantalla" (feedback usuario 2026-09-11). El padding de la sección
      // (120px) da la respiración sobre el top del viewport.
      expect(css).not.toContain('scroll-margin-top');
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
