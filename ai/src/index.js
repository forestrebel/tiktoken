const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8081;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ai-service' });
});

// Start server
app.listen(port, () => {
  console.log(`AI Service listening on port ${port}`);
}); 