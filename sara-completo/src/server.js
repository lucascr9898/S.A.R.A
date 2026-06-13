require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const routes  = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sistema: 'S.A.R.A', versao: '1.0.0', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`\n🟢 S.A.R.A API rodando na porta ${PORT}`);
  console.log(`   http://localhost:${PORT}/health\n`);
});

module.exports = app;
