import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResultsScreen from '@/components/ResultsScreen';
import { QuizAnswers } from '@/lib/quizData';
import { PAYMENT_LINKS, VAULT_PRICE_USD, VAULT_PRODUCT_NAME } from '@/lib/stripeConfig';
import { createCheckout, paymentLinkUrl } from '@/lib/revenueBackend';

const answers: QuizAnswers = {
  lifeStage: 'adult',
  weight: '20-28',
  bodyCondition: 5,
  concern: 'diet',
  activityLevel: 'moderate',
  environment: ['apartment', 'hot'],
};

const plan = [{ icon: 'utensils', title: 'Feeding', items: ['Fresh water'] }];

beforeEach(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('Care Vault offer', () => {
  it('keeps the JSON-LD offer equal to the Stripe price shown in the app', () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const schema = JSON.parse(match![1]);
    expect(schema['@type']).toBe('Product');
    expect(schema.name).toBe(VAULT_PRODUCT_NAME);
    expect(schema.offers.price).toBe(VAULT_PRICE_USD);
    expect(schema.offers.priceCurrency).toBe('USD');
    expect(schema).not.toHaveProperty('aggregateRating');
    expect(schema).not.toHaveProperty('review');
  });

  it('shows the free result, the $7.99 CTA and pricing with no email on file', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    render(<ResultsScreen plan={plan} answers={answers} onStartOver={() => {}} onUpgrade={() => {}} />);

    expect(screen.getByText('Fresh water')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Get the full Care Vault — $${VAULT_PRICE_USD}` })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Free plan or the full Frenchie Care Vault/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Restore purchase/i })).toHaveAttribute('href', '/payment-success?restore=1');
    expect(screen.getByRole('heading', { name: /Frenchie care emails \(optional\)/i })).toBeInTheDocument();
  });

  it('does not send the optional email without explicit consent', () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('offline')));
    vi.stubGlobal('fetch', fetchMock);
    render(<ResultsScreen plan={plan} answers={answers} onStartOver={() => {}} onUpgrade={() => {}} />);

    fireEvent.change(screen.getByLabelText('Email address (optional)'), { target: { value: 'owner@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign me up' }));

    expect(screen.getByText(/Tick the box to agree/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/lead'), expect.anything());
  });

  it('falls back to the $7.99 Payment Link when the worker has no Checkout Session', () => {
    expect(paymentLinkUrl(false, '')).toBe(PAYMENT_LINKS.vault);
  });

  it('goes straight to the Payment Link, without a failing create-payment call, in payment-links mode', async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve(new Response(
      JSON.stringify(url.endsWith('/health') ? { ok: true, checkoutMode: 'payment-links' } : { error: 'should not be called' }),
      { status: url.endsWith('/health') ? 200 : 503, headers: { 'content-type': 'application/json' } },
    )));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createCheckout({ email: '', addBump: false, answers });

    expect(result).toEqual({ url: PAYMENT_LINKS.vault, mode: 'payment-link' });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('create-payment'))).toBe(false);
  });
});
