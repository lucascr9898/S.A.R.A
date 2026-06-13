const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    database: process.env.DB_NAME     || 'sara_db',
    user:     process.env.DB_USER     || 'sara_user',
    password: process.env.DB_PASSWORD || 'sara_senha_segura',
    multipleStatements: true,
  });

  try {
    console.log('[MIGRATE] criando tabelas...');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        nome       VARCHAR(120) NOT NULL,
        email      VARCHAR(180) UNIQUE NOT NULL,
        senha_hash TEXT NOT NULL,
        perfil     VARCHAR(20) NOT NULL DEFAULT 'admin',
        criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        nome            VARCHAR(200) NOT NULL,
        marca           VARCHAR(120) NOT NULL,
        categoria       VARCHAR(80),
        codigo_barras   VARCHAR(60) UNIQUE NOT NULL,
        lote            VARCHAR(60) NOT NULL,
        data_fabricacao DATE NOT NULL,
        local_origem    VARCHAR(200),
        descricao       TEXT,
        criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS qrcodes (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        codigo     VARCHAR(80) UNIQUE NOT NULL,
        produto_id INT NOT NULL,
        status     VARCHAR(20) NOT NULL DEFAULT 'ativo',
        vendido    TINYINT(1) DEFAULT 0,
        criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS registros_venda (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        qrcode_id  INT NOT NULL,
        produto_id INT NOT NULL,
        data_venda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        local_venda VARCHAR(200) NOT NULL,
        vendedor   VARCHAR(120),
        observacao TEXT,
        FOREIGN KEY (qrcode_id)  REFERENCES qrcodes(id)  ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS log_verificacoes (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        qrcode_id     INT,
        codigo        VARCHAR(80) NOT NULL,
        resultado     VARCHAR(20) NOT NULL,
        ip_origem     VARCHAR(60),
        verificado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (qrcode_id) REFERENCES qrcodes(id) ON DELETE SET NULL
      );
    `);

    await conn.query(`CREATE INDEX IF NOT EXISTS idx_qrcodes_codigo  ON qrcodes(codigo);`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_log_qrcode      ON log_verificacoes(qrcode_id);`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_produtos_barcode ON produtos(codigo_barras);`);

    console.log('[MIGRATE] ✅ tabelas criadas');
  } catch (err) {
    console.error('[MIGRATE] erro:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
}

migrate();
