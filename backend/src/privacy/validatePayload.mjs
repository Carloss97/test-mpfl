// validatePayload.mjs — Validación server-side de privacidad para POST /sessions.
// Reutiliza los validadores del runtime (aggregate-only, FORBIDDEN_KEYS) como
// ÚLTIMA FRONTERA: el backend nunca persiste un payload que no haya pasado
// validateFinalAssessmentPayload + el escaneo de ASSESSMENT_FORBIDDEN_KEYS.

import {
  ASSESSMENT_FORBIDDEN_KEYS,
  validateAssessmentSessionPrivacy,
} from '../../../src/assessment/assessmentSession.js';
import { validateFinalAssessmentPayload } from '../../../src/assessment/finalAssessmentPayload.js';

export const FORBIDDEN_KEYS = Object.freeze([...ASSESSMENT_FORBIDDEN_KEYS]);

/**
 * Escanea recursivamente un valor (objeto/array) buscando claves prohibidas.
 * Devuelve la lista de claves prohibidas encontradas (unique).
 */
export function scanForbiddenKeys(value, path = []) {
  const violations = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.includes(key)) violations.push(key);
      visit(child);
    }
  };
  visit(value);
  return [...new Set(violations)];
}

/**
 * Valida el body de POST /sessions.
 * Devuelve { ok, violations, payload } — ok===true solo si:
 *   - privacyValidation.ok === true (gobernanza + privacy-safe),
 *   - validateFinalAssessmentPayload.ok === true,
 *   - no hay FORBIDDEN_KEYS en ningún nivel.
 */
export function validateSessionPayload(body = {}) {
  const violations = [];

  const privacy = validateAssessmentSessionPrivacy(body);
  if (!privacy.ok) violations.push(...privacy.violations);

  const final = validateFinalAssessmentPayload(body);
  if (!final.ok) violations.push(...final.violations);

  const forbidden = scanForbiddenKeys(body);
  violations.push(...forbidden);

  const unique = [...new Set(violations)];
  return {
    ok: unique.length === 0,
    violations: unique,
  };
}

/**
 * Extrae el runId del body (campo requerido para la PK de la tabla sessions).
 */
export function extractRunId(body = {}) {
  return typeof body?.runId === 'string' && body.runId.trim() ? body.runId.trim() : null;
}