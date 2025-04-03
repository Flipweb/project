import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: resolve(__dirname, '../../.env') });

const app = express();
const PORT = 3002;

// Enable CORS for the frontend
app.use(cors({
  origin: process.env.VITE_APP_URL,
  credentials: true
}));
app.use(express.json());

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Email monitoring endpoints
app.post('/monitor', async (req, res) => {
  try {
    const { emailId, recipient, type, status, error } = req.body;
    
    if (!emailId || !recipient || !type || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error: dbError } = await supabase
      .from('email_logs')
      .insert([{
        email_id: emailId,
        recipient,
        type,
        status,
        error,
        timestamp: new Date().toISOString()
      }]);

    if (dbError) throw dbError;
    res.json({ success: true });
  } catch (error) {
    console.error('Email monitoring error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const { data, error } = await supabase
      .rpc('get_email_stats', {
        start_date,
        end_date
      });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Email service running on port ${PORT}`);
  console.log(`Allowing requests from: ${process.env.VITE_APP_URL}`);
});