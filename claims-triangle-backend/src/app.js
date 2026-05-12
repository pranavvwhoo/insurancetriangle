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

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
}));
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
