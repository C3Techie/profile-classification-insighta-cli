import { describe, it, expect, vi } from 'vitest';
import { getBackendUrl } from './api';
import * as credentials from './credentials';

vi.mock('./credentials', () => ({
  loadCredentials: vi.fn(),
  updateTokens: vi.fn(),
  clearCredentials: vi.fn()
}));

describe('CLI API Client', () => {
  it('should use the default backend URL if no credentials or ENV set', () => {
    vi.mocked(credentials.loadCredentials).mockReturnValue(null);
    delete process.env.INSIGHTA_API_URL;
    
    const url = getBackendUrl();
    expect(url).toBe('https://profile-classification-api.vercel.app');
  });

  it('should use the backend URL from credentials if present', () => {
    vi.mocked(credentials.loadCredentials).mockReturnValue({
      backend_url: 'http://custom-api.com',
      access_token: 'abc',
      refresh_token: 'def',
      username: 'test',
      role: 'admin'
    } as credentials.Credentials);
    
    const url = getBackendUrl();
    expect(url).toBe('http://custom-api.com');
  });
});
