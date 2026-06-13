const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  database: process.env.DB_NAME     || 'sara_db',
  user:     process.env.DB_USER     || 'sara_user',
  password: process.env.DB_PASSWORD || 'sara_senha_segura',
  waitForConnections: true,
  connectionLimit: 10,
});

pool.getConnection()
  .then(conn => { console.log('[DB] Conectado ao MySQL'); conn.release(); })
  .catch(err  => console.error('[DB] Erro ao conectar:', err.message));

const originalQuery = pool.query.bind(pool);
pool.query = async (sql, params) => {
  const [rows] = await originalQuery(sql, params);
  return { rows: Array.isArray(rows) ? rows : [rows] };
};

pool.connect = async () => {
  const conn = await pool.pool.getConnection();
  return {
    query: async (sql, params) => {
      const [rows] = await conn.query(sql, params);
      return { rows: Array.isArray(rows) ? rows : [rows] };
    },
    release: () => conn.release(),
  };
};

module.exports = pool;
