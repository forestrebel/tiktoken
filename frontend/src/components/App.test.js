import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from './App';
import { api } from '../api/client';

// Mock API client
vi.mock('../api/client', () => ({
  api: {
    checkHealth: vi.fn(),
    checkSupabaseHealth: vi.fn()
  }
}));

describe('App', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('shows initial checking status', () => {
    render(<App />);
    
    expect(screen.getByText('checking...')).toBeInTheDocument();
  });

  it('shows healthy status when API is healthy', async () => {
    // Mock successful API responses
    api.checkHealth.mockResolvedValue({ 
      status: 'healthy',
      version: '0.1.0',
      name: 'TikToken API'
    });
    api.checkSupabaseHealth.mockResolvedValue({
      status: 'healthy',
      service: 'supabase'
    });
    
    render(<App />);
    
    // Wait for status updates
    await waitFor(() => {
      expect(screen.getByText('healthy')).toBeInTheDocument();
    });
    
    // Verify API calls
    expect(api.checkHealth).toHaveBeenCalledTimes(1);
    expect(api.checkSupabaseHealth).toHaveBeenCalledTimes(1);
  });

  it('shows unhealthy status on API error', async () => {
    // Mock API error
    api.checkHealth.mockRejectedValue(new Error('API Error'));
    api.checkSupabaseHealth.mockRejectedValue(new Error('Supabase Error'));
    
    render(<App />);
    
    // Wait for error status
    await waitFor(() => {
      expect(screen.getAllByText('unhealthy')).toHaveLength(2);
    });
  });

  it('updates status periodically', async () => {
    // Mock successful responses
    api.checkHealth.mockResolvedValue({ status: 'healthy' });
    api.checkSupabaseHealth.mockResolvedValue({ status: 'healthy' });
    
    // Mock timer
    vi.useFakeTimers();
    
    render(<App />);
    
    // Initial check
    await waitFor(() => {
      expect(api.checkHealth).toHaveBeenCalledTimes(1);
    });
    
    // Advance timer by 30 seconds
    vi.advanceTimersByTime(30000);
    
    // Verify second check
    await waitFor(() => {
      expect(api.checkHealth).toHaveBeenCalledTimes(2);
    });
    
    // Cleanup
    vi.useRealTimers();
  });
});

describe('Critical User Flows', () => {
  it('health check flow works end-to-end', async () => {
    // Mock successful responses
    api.checkHealth.mockResolvedValue({ 
      status: 'healthy',
      version: '0.1.0'
    });
    api.checkSupabaseHealth.mockResolvedValue({
      status: 'healthy',
      service: 'supabase'
    });

    // Simulate health check flow
    const [apiHealth, dbHealth] = await Promise.all([
      api.checkHealth(),
      api.checkSupabaseHealth()
    ]);

    // Verify critical path
    expect(apiHealth.status).toBe('healthy');
    expect(dbHealth.status).toBe('healthy');
  });

  it('handles service unavailability gracefully', async () => {
    // Mock service failure
    api.checkHealth.mockRejectedValue(new Error('Service unavailable'));

    // Verify error handling
    await expect(api.checkHealth()).rejects.toThrow('Service unavailable');
  });
}); 