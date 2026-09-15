import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DemoRequestPage, { validateDemoRequest } from './DemoRequestPage.jsx';
import { resolveV3Route, V3_SHELLS } from '../v3/v3Routes.js';

const validForm = {
  name: 'Ada Lovelace',
  workEmail: 'ada@analytical.example',
  company: 'Analytical Engines Ltd',
  role: 'Engineering Lead',
  teamSize: '11-50',
  useCase: 'Structured hiring assessment.',
};

function renderPage(props = {}) {
  return render(<DemoRequestPage apiBase="https://api.test/staging" {...props} />);
}

const FIELD_LABELS = Object.freeze({
  name: /nombre/i,
  workEmail: /correo/i,
  company: /empresa/i,
  role: /cargo/i,
  teamSize: /tamaño/i,
  useCase: /caso de uso/i,
});

function completeForm(values = validForm) {
  for (const [name, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(FIELD_LABELS[name]), { target: { value } });
  }
  fireEvent.click(screen.getByLabelText(/autorizo/i));
}

afterEach(() => vi.unstubAllGlobals());

describe('DemoRequestPage', () => {
  it('registers /solicitar-demo as a bare public route', () => {
    expect(resolveV3Route('/solicitar-demo')).toMatchObject({ page: 'demoRequest', shell: V3_SHELLS.DEMO_REQUEST });
  });

  it('uses a one-column stack at desktop widths, with branded intro above the form', () => {
    const { container } = renderPage({ fetchImpl: vi.fn() });
    const stack = container.querySelector('.demo-request__stack');
    expect(stack).not.toBeNull();
    expect(stack.querySelector('.demo-request__intro')).not.toBeNull();
    expect(stack.querySelector('.demo-request__form')).not.toBeNull();
    expect(stack.firstElementChild).toHaveClass('demo-request__intro');
    expect(stack.lastElementChild).toHaveClass('demo-request__form');
  });

  it('validates required fields, email shape, and contact consent before any request', () => {
    const errors = validateDemoRequest({ ...validForm, workEmail: 'not-an-email', contactConsent: false });
    expect(errors).toMatchObject({ workEmail: expect.any(String), contactConsent: expect.any(String) });

    const fetchImpl = vi.fn();
    renderPage({ fetchImpl });
    fireEvent.click(screen.getByRole('button', { name: /solicitar demo/i }));
    expect(screen.getAllByText(/obligatorio/i).length).toBeGreaterThan(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('submits exactly the allowlisted payload and shows a privacy-safe confirmation', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ requestId: 'internal-id', status: 'received' }) });
    renderPage({ fetchImpl });
    completeForm();
    fireEvent.click(screen.getByRole('button', { name: /solicitar demo/i }));

    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.test/staging/demo-requests');
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(init.body)).toEqual({ ...validForm, contactConsent: true });
    expect(url).not.toContain(validForm.workEmail);
    expect(init.body).not.toContain('requestId');

    expect(await screen.findByRole('heading', { name: /recibimos tu solicitud/i })).toBeInTheDocument();
    expect(screen.queryByText('internal-id')).toBeNull();
    expect(screen.queryByText(validForm.workEmail)).toBeNull();
  });

  it('prevents a second submit while the first request is busy', async () => {
    let resolveRequest;
    const fetchImpl = vi.fn(() => new Promise((resolve) => { resolveRequest = resolve; }));
    renderPage({ fetchImpl });
    completeForm();
    const submit = screen.getByRole('button', { name: /solicitar demo/i });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    resolveRequest({ status: 201, json: async () => ({}) });
    expect(await screen.findByRole('heading', { name: /recibimos tu solicitud/i })).toBeInTheDocument();
  });

  it('renders field errors returned by the server and keeps the form editable', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ error: 'validation_failed', violations: ['workEmail', 'contactConsent'] }) });
    renderPage({ fetchImpl });
    completeForm();
    fireEvent.click(screen.getByRole('button', { name: /solicitar demo/i }));

    expect(await screen.findByText(/revisa el correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/correo/i)).toBeEnabled();
  });

  it('shows a generic network error without leaking form values into the endpoint URL or UI', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network unavailable'));
    renderPage({ fetchImpl });
    completeForm();
    fireEvent.click(screen.getByRole('button', { name: /solicitar demo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos enviar/i);
    expect(fetchImpl.mock.calls[0][0]).not.toContain(validForm.workEmail);
    expect(screen.queryByText(validForm.workEmail)).toBeNull();
  });
});
