//server/server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

import { connectDB } from './config/database.js';
import authRoutes from './routes/auth.js';
import googleAuthRoutes from './routes/googleAuth.js';
import workflowRoutes from './routes/workflows.js';
import aiRoutes from './routes/aiRoutes.js';
import integrationRoutes from './routes/integrations.js'; // ADD THIS
import { authenticateToken } from './middleware/auth.js';
import scriptRoutes from "./routes/scripts.js"
import huggingfaceRoutes from "./routes/huggingfaceRoutes.js";
import hostedScriptRoutes from './routes/hostedScriptRoutes.js'
import workflowGenerationRoutes from './routes/workflowGeneration.js';
// import workflowGenerationRoutes from './routes/enhancedWorkflowGeneration.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/google', googleAuthRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/integrations', integrationRoutes); // ADD THIS
app.use('/api/scripts', scriptRoutes);
app.use('/api/huggingface', huggingfaceRoutes);
app.use('/api/hosted-scripts', hostedScriptRoutes);
app.use('/api/workflow-generation', workflowGenerationRoutes);

// Socket.io for real-time workflow execution updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-workflow', (workflowId) => {
    socket.join(workflowId);
    console.log(`Client ${socket.id} joined workflow ${workflowId}`);
  });

  socket.on('workflow-execution-update', (data) => {
    socket.to(data.workflowId).emit('workflow-execution-update', data);
  });

  socket.on('node-status-update', (data) => {
    socket.to(data.workflowId).emit('node-status-update', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Workflow Automation API is running',
    timestamp: new Date().toISOString()
  });
});

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ 
    message: 'This is a protected route',
    user: req.user 
  });
});

// OAuth callback endpoint
app.get('/api/integrations/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    // Handle OAuth callback
    res.redirect(`${process.env.FRONTEND_URL}/integrations?oauth=success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/integrations?oauth=error`);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

// Start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Google OAuth configured: ${!!process.env.GOOGLE_CLIENT_ID}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { io };