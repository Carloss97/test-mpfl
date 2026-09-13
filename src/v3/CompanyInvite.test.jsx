// A.1 (KRU-112): CompanyInvitePanel — creación de invitaciones desde el
// dashboard empresa (solo modo real). Tests: form, POST con Bearer, estados
// success/error/auth, y visibilidad en el dashboard por source.
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { V3_COPY } from './v3Copy.js';
import { storeAuth } from './cognitoAuth.js';
import CompanyInvitePanel from './CompanyInvitePanel.jsx';
import CompanyDashboardPage from './CompanyDashboardPage.jsx';

const EMAIL_LABEL = V3_COPY.es.invite.emailLabel;

function renderPanel(props = {}) {
  return render(
    <LanguageProvider>
      <CompanyInvitePanel apiBase="https://api.test" {...props} />
    </LanguageProvider>,
  );
}

function okResponse(emailSent = true) {
  return {
    ok: true,
    status: 201,
    json: async () => ({
      invitationId: 'tok-123',
      expiresAt: '2026-09-14T00:00:00.000Z',
      singleUse: true,
      createdAt: '2026-09-13T00:00:00.000Z',
      maskedEmail: 'ju***@x.cl',
      status: 'pending',
      email: { sent: emailSent, reason: emailSent ? null : 'no_from_email' },
    }),
  };
}

function fillEmail() {
  fireEvent.change(screen.getByLabelText(EMAIL_LABEL), { target: { value: 'cand@x.cl' } });
}

describe('A.1 — CompanyInvitePanel (KRU-112)', () => {
  beforeEach(() => { sessionStorage.clear(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('form inicial: título, input email, submit deshabilitado hasta haber email', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: V3_COPY.es.invite.title })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.invite.subtitle)).toBeInTheDocument();
    const input = screen.getByLabelText(EMAIL_LABEL);
    expect(input).toHaveAttribute('type', 'email');
    expect(screen.getByTestId('v3-co-invite-submit')).toBeDisabled();
    fillEmail();
    expect(screen.getByTestId('v3-co-invite-submit')).not.toBeDisabled();
  });

  it('submit con sesión: POST {apiBase}/invitations con Bearer + {email, ttlHours}', async () => {
    storeAuth({ access_token: 'at-1', refresh_token: null, expires_in: 3600 });
    const fetchImpl = vi.fn(async () => okResponse());
    renderPanel({ fetchImpl });
    fillEmail();
    fireEvent.click(screen.getByTestId('v3-co-invite-submit'));
    await waitFor(() => { expect(fetchImpl).toHaveBeenCalledTimes(1); });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.test/invitations');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer ' + 'at-1');
    expect(JSON.parse(init.body)).toMatchObject({ email: 'cand@x.cl', ttlHours: 72 });
  });

  it('éxito: caja success + link manual (origin + token) + botón "Invitar a otro"', async () => {
    storeAuth({ access_token: 'at-1', expires_in: 3600 });
    const fetchImpl = vi.fn(async () => okResponse());
    renderPanel({ fetchImpl });
    fillEmail();
    fireEvent.click(screen.getByTestId('v3-co-invite-submit'));
    const box = await screen.findByTestId('v3-co-invite-success');
    expect(box).toHaveTextContent(V3_COPY.es.invite.success);
    const link = screen.getByTestId('v3-co-invite-link');
    expect(link).toHaveAttribute('href', `${window.location.origin}/postulaciones?invite=tok-123`);
    expect(screen.getByTestId('v3-co-invite-again')).toBeInTheDocument();
  });

  it('"Invitar a otro" reinicia el form', async () => {
    storeAuth({ access_token: 'at-1', expires_in: 3600 });
    const fetchImpl = vi.fn(async () => okResponse());
    renderPanel({ fetchImpl });
    fillEmail();
    fireEvent.click(screen.getByTestId('v3-co-invite-submit'));
    await screen.findByTestId('v3-co-invite-success');
    fireEvent.click(screen.getByTestId('v3-co-invite-again'));
    expect(screen.queryByTestId('v3-co-invite-success')).toBeNull();
    expect(screen.getByLabelText(EMAIL_LABEL)).toHaveValue('');
    expect(screen.getByTestId('v3-co-invite-submit')).toBeDisabled();
  });

  it('éxito con email no enviado: variante successEmailFailed', async () => {
    storeAuth({ access_token: 'at-1', expires_in: 3600 });
    const fetchImpl = vi.fn(async () => okResponse(false));
    renderPanel({ fetchImpl });
    fillEmail();
    fireEvent.click(screen.getByTestId('v3-co-invite-submit'));
    const box = await screen.findByTestId('v3-co-invite-success');
    expect(box).toHaveTextContent(V3_COPY.es.invite.successEmailFailed);
  });

  it('fallo HTTP (422): caja de error + form sigue editable', async () => {
    storeAuth({ access_token: 'at-1', expires_in: 3600 });
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 422,
      json: async () => ({ error: 'invalid_email', violations: ['email'] }),
    }));
    renderPanel({ fetchImpl });
    fillEmail();
    fireEvent.click(screen.getByTestId('v3-co-invite-submit'));
    const err = await screen.findByTestId('v3-co-invite-error');
    expect(err).toHaveTextContent(V3_COPY.es.invite.error);
    expect(screen.getByLabelText(EMAIL_LABEL)).toBeEnabled();
  });

  it('403 (sin grupo): onAuthRequired llamado, sin caja de error', async () => {
    storeAuth({ access_token: 'at-1', expires_in: 3600 });
    const onAuthRequired = vi.fn();
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ error: 'forbidden' }) }));
    renderPanel({ fetchImpl, onAuthRequired });
    fillEmail();
    fireEvent.click(screen.getByTestId('v3-co-invite-submit'));
    await waitFor(() => { expect(onAuthRequired).toHaveBeenCalled(); });
    expect(screen.queryByTestId('v3-co-invite-error')).toBeNull();
  });

  it('sin sesión (no auth): onAuthRequired, sin fetch', async () => {
    const onAuthRequired = vi.fn();
    const fetchImpl = vi.fn();
    renderPanel({ fetchImpl, onAuthRequired });
    fillEmail();
    fireEvent.click(screen.getByTestId('v3-co-invite-submit'));
    await waitFor(() => { expect(onAuthRequired).toHaveBeenCalled(); });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('dashboard: panel OCULTO en modo demo (showcase público)', () => {
    render(
      <LanguageProvider>
        <CompanyDashboardPage data={{ source: 'demo', processes: [] }} />
      </LanguageProvider>,
    );
    expect(screen.queryByRole('heading', { name: V3_COPY.es.invite.title })).toBeNull();
  });

  it('dashboard: panel VISIBLE en modo real', () => {
    render(
      <LanguageProvider>
        <CompanyDashboardPage data={{ source: 'real', processes: [] }} />
      </LanguageProvider>,
    );
    expect(screen.getByRole('heading', { name: V3_COPY.es.invite.title })).toBeInTheDocument();
  });
});

describe('A.1 — createInvitation (módulo)', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('sin email/sin apiBase → invalid_input, sin fetch', async () => {
    const { createInvitation } = await import('./companyInvitations.js');
    const fetchImpl = vi.fn();
    expect((await createInvitation({ apiBase: 'https://api.test', email: '  ', fetchImpl })).code).toBe('invalid_input');
    expect((await createInvitation({ apiBase: null, email: 'x@y.cl', fetchImpl })).code).toBe('invalid_input');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('buildInvitationLink: origin + /postulaciones?invite=<token>', async () => {
    const { buildInvitationLink } = await import('./companyInvitations.js');
    expect(buildInvitationLink({ origin: 'https://stage.krumm.cl', invitationId: 'abc' }))
      .toBe('https://stage.krumm.cl/postulaciones?invite=abc');
  });
});
