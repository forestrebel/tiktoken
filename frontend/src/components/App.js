import { useState, useEffect } from 'react';
import { api } from '../api/client';

/**
 * @typedef {Object} HealthStatus
 * @property {string} api - API health status
 * @property {string} supabase - Supabase health status
 */

export function App() {
  /** @type {[HealthStatus, Function]} */
  const [health, setHealth] = useState({
    api: 'checking...',
    supabase: 'checking...'
  });

  useEffect(() => {
    async function checkHealth() {
      try {
        const [apiHealth, supabaseHealth] = await Promise.all([
          api.checkHealth(),
          api.checkSupabaseHealth()
        ]);

        setHealth({
          api: apiHealth.status,
          supabase: supabaseHealth.status
        });
      } catch (error) {
        console.error('Health check failed:', error);
        setHealth({
          api: 'unhealthy',
          supabase: 'unhealthy'
        });
      }
    }

    checkHealth();
    // Poll health status every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>TikToken</h1>
        <p>Secure token management and trading platform</p>
      </header>

      <main className="app-main">
        <section className="health-status">
          <h2>System Status</h2>
          <div className="status-grid">
            <div className={`status-item ${health.api}`}>
              <span className="status-label">API</span>
              <span className="status-value">{health.api}</span>
            </div>
            <div className={`status-item ${health.supabase}`}>
              <span className="status-label">Database</span>
              <span className="status-value">{health.supabase}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 