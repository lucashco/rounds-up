import { describe, expect, it } from 'vitest';
import { readMonetizationConfig, safeSupportUrl } from './config';

// Synthetic test-only values, never used by the app or .env.example.
const clientId = `ca-pub-${'1'.repeat(16)}`;
const slotId = '2'.repeat(10);

describe('public monetization configuration', () => {
  it('desativa monetização quando não há configuração', () => {
    expect(readMonetizationConfig({})).toEqual({ adsense: null, supportUrl: null });
  });
  it('aceita apenas IDs completos, com formato válido, sem valores padrão', () => {
    expect(readMonetizationConfig({ PUBLIC_ADSENSE_CLIENT_ID: clientId }).adsense).toBeNull();
    expect(readMonetizationConfig({ PUBLIC_ADSENSE_SLOT_ID: slotId }).adsense).toBeNull();
    expect(readMonetizationConfig({ PUBLIC_ADSENSE_CLIENT_ID: 'not-an-id', PUBLIC_ADSENSE_SLOT_ID: slotId }).adsense).toBeNull();
    expect(readMonetizationConfig({ PUBLIC_ADSENSE_CLIENT_ID: clientId, PUBLIC_ADSENSE_SLOT_ID: 'invalid' }).adsense).toBeNull();
    expect(readMonetizationConfig({ PUBLIC_ADSENSE_CLIENT_ID: clientId, PUBLIC_ADSENSE_SLOT_ID: slotId }).adsense).toEqual({ clientId, slotId });
  });
  it.each(['', '/support', '//example.org/support', 'javascript:alert(1)', 'data:text/html,test', 'http://example.org',
    'https://user:password@example.org/support', 'https://example.org@other.example/support', 'not-a-url', 42, null])('rejeita URL insegura ou inválida %#', input => {
    expect(safeSupportUrl(input)).toBeNull();
  });
  it('normaliza URL HTTPS sem transmitir dados do aplicativo', () => {
    expect(safeSupportUrl(' https://example.org/support?campaign=rounds-up ')).toBe('https://example.org/support?campaign=rounds-up');
    expect(readMonetizationConfig({ PUBLIC_SUPPORT_URL: 'https://example.org/support' }).supportUrl).toBe('https://example.org/support');
  });
});
