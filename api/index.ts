// Vercel Serverless Function entry point
import express from 'express';
import { apiRouter } from '../server/apiRouter.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Mount API router for both `/api` prefixed URLs and non-prefixed URLs (in case Vercel rewrites strip /api)
app.use('/api', apiRouter);
app.use(apiRouter);

// Fallback JSON 404 for any unhandled API routes to prevent HTML error responses
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.url}`
  });
});

export default app;
