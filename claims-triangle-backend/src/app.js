require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const projectsRoute = require('./routes/projects');
const uploadRoute = require('./routes/upload');
const mappingRoute = require('./routes/mapping');
const triangleRoute = require('./routes/triangle');

const app = express();
const PORT = process.env.PORT || 4000;

const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const extraOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = new Set(
  [...defaultOrigins, process.env.FRONTEND_URL, ...extraOrigins].filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'claims-triangle-backend', time: new Date().toISOString() }));

app.use('/api/projects', projectsRoute);
app.use('/api/upload', uploadRoute);
app.use('/api/mapping', mappingRoute);
app.use('/api/triangle', triangleRoute);

app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found: ' + req.method + ' ' + req.path }));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log('  Claims Triangle Backend → http://localhost:' + PORT);
  console.log('  Health check           → http://localhost:' + PORT + '/health');
});

module.exports = app;
