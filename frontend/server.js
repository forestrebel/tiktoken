import express from 'express';
import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createDevServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'tiktoken-frontend',
      version: '0.1.0'
    });
  });

  // Create Vite server in middleware mode
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createDevServer(); 