import { describe, it, expect, beforeEach } from 'vitest';
import { api } from './client';

describe('API Client', () => {
  let originalFetch;

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch;
    // Mock fetch for tests
    global.fetch = vi.fn();
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  it('makes API requests with correct headers', async () => {
    // Mock successful response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' })
    });

    await api.checkHealth();

    expect(global.fetch).toHaveBeenCalledWith('/api/health', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });

  it('handles API errors appropriately', async () => {
    // Mock failed response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    await expect(api.checkHealth()).rejects.toThrow('API error: 500');
  });

  it('handles network errors gracefully', async () => {
    // Mock network failure
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(api.checkHealth()).rejects.toThrow('Network error');
  });
}); 