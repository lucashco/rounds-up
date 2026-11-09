// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { AdSlot } from './AdSlot';
import { SupportLink } from './SupportLink';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const configured = { clientId: `ca-pub-${'1'.repeat(16)}`, slotId: '2'.repeat(10) };

describe('monetization components', () => {
  it('não mostra placeholders nem scripts sem configuração', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      await act(async () => root.render(createElement('div', null, createElement(AdSlot, { config: null }), createElement(SupportLink, { url: null }))));
      expect(container.querySelector('aside')).toBeNull();
      expect(container.querySelector('a')).toBeNull();
      expect(container.querySelector('script')).toBeNull();
      expect(container.textContent).toBe('');
    } finally { await act(async () => root.unmount()); }
  });

  it('reserva espaço fixo para a unidade manual e não carrega script mesmo com IDs', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      await act(async () => root.render(createElement(AdSlot, { config: configured })));
      expect(container.querySelector('aside')?.getAttribute('aria-label')).toBe('Publicidade');
      expect(container.querySelector('aside')?.classList.contains('h-[314px]')).toBe(true);
      const unit = container.querySelector('ins');
      expect(unit?.getAttribute('data-ad-client')).toBe(configured.clientId);
      expect(unit?.getAttribute('data-ad-slot')).toBe(configured.slotId);
      expect(unit?.style.width).toBe('250px');
      expect(unit?.style.height).toBe('250px');
      expect(unit?.textContent).toBe('');
      expect(document.querySelector('script[src*="googlesyndication"]')).toBeNull();
    } finally { await act(async () => root.unmount()); }
  });

  it('oculta unidade com IDs inválidos', async () => {
    const container = document.createElement('div'); const root = createRoot(container);
    try {
      await act(async () => root.render(createElement(AdSlot, { config: { clientId: '', slotId: '' } })));
      expect(container.innerHTML).toBe('');
    } finally { await act(async () => root.unmount()); }
  });

  it('link HTTPS é acessível e isola a nova aba, sem referrer', async () => {
    const container = document.createElement('div'); const root = createRoot(container);
    try {
      await act(async () => root.render(createElement(SupportLink, { url: 'https://example.org/support' })));
      const link = container.querySelector('a');
      expect(link?.textContent).toContain('Apoie o Rounds Up');
      expect(link?.textContent).toContain('abre em nova aba');
      expect(link?.href).toBe('https://example.org/support');
      expect(link?.target).toBe('_blank');
      expect(link?.relList.contains('noopener')).toBe(true);
      expect(link?.relList.contains('noreferrer')).toBe(true);
      expect(link?.getAttribute('referrerpolicy')).toBe('no-referrer');
      await act(async () => root.render(createElement(SupportLink, { url: 'javascript:alert(1)' })));
      expect(container.querySelector('a')).toBeNull();
    } finally { await act(async () => root.unmount()); }
  });
});
