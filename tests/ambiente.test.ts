import { describe, expect, it } from 'vitest';

describe('ambiente de teste', () => {
  it('usa o fuso de São Paulo', () => {
    // 01:30 UTC de 07/10 ainda é 22:30 de 06/10 em São Paulo.
    expect(new Date(Date.UTC(2026, 9, 7, 1, 30)).getDate()).toBe(6);
  });

  it('tem IndexedDB simulado', () => {
    expect(typeof indexedDB.open).toBe('function');
  });

  it('tem os matchers do jest-dom', () => {
    const p = document.createElement('p');
    p.textContent = 'oi';
    document.body.appendChild(p);
    expect(p).toBeInTheDocument();
  });
});
