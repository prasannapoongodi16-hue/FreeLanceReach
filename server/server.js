import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import discoveryRoutes from './routes/discoveryRoutes.js';
import websiteRoutes from './routes/websiteRoutes.js';
import emailDraftRoutes from './routes/emailDraftRoutes.js';
import gmailRoutes from './routes/gmailRoutes.js';

dotenv.config();

const app = express();

app.use(helmet());

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false
}));

// Vercel reuses the exported app between invocations, so initialize MongoDB
// once per warm instance and await it before dispatching any route.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    res.status(503).json({ success: false, message: 'Database unavailable' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'FreelanceReach API is running' });
});

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.status(dbState === 1 ? 200 : 503).json({
    application: 'FreelanceReach',
    server: 'running',
    database: dbState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/email-drafts', emailDraftRoutes);
app.use('/api/gmail', gmailRoutes);

const PORT = process.env.PORT || 5000;

export default app;

// Vercel imports the app as a handler. Start a listener only for local use.
if (process.env.VERCEL !== '1') {
  const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  };
  startServer().catch((error) => {
    console.error('Server startup failed:', error.message);
    process.exitCode = 1;
  });
}
