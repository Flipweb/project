import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: resolve(__dirname, '../../.env') });

const app = express();
const PORT = 3000;

// Enable CORS for the frontend
app.use(cors({
  origin: process.env.VITE_APP_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📝 [Gateway] ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  next();
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('❌ [Gateway Error]', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({ error: 'Internal Server Error' });
});

// Auth Service Proxy
app.use('/auth', async (req, res) => {
  try {
    console.log('🔒 [Auth Request]', {
      method: req.method,
      path: req.path,
      body: req.body
    });

    const response = await axios({
      method: req.method,
      url: `http://localhost:3001${req.path}`,
      data: req.body,
      headers: {
        ...req.headers,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ [Auth Response]', {
      status: response.status,
      data: response.data
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('❌ [Auth Service Error]', {
      path: req.path,
      method: req.method,
      error: error.response?.data || error.message,
      stack: error.stack
    });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Auth service error'
    });
  }
});

// Email Service Proxy
app.use('/email', async (req, res) => {
  try {
    console.log('📧 [Email Request]', {
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query
    });

    const response = await axios({
      method: req.method,
      url: `http://localhost:3002${req.path}`,
      data: req.body,
      params: req.query,
      headers: {
        ...req.headers,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ [Email Response]', {
      status: response.status,
      data: response.data
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('❌ [Email Service Error]', {
      path: req.path,
      method: req.method,
      error: error.response?.data || error.message,
      stack: error.stack
    });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Email service error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`🔗 Allowing requests from: ${process.env.VITE_APP_URL}`);
});