const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function seed() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    database: process.env.DB_NAME     || 'sara_db',
    user:     process.env.DB_USER     || 'sara_user',
    password: process.env.DB_PASSWORD || 'sara_senha_segura',
  });

  try {
    
    await conn.query('START TRANSACTION');

    const senhaHash = await bcrypt.hash('admin123', 10);
    await conn.query(`
      INSERT INTO usuarios (nome, email, senha_hash, perfil)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE nome = nome;
    `, ['Administrador', 'admin@sara.com', senhaHash, 'admin']);
    

    const produtos = [
      { nome: 'Perfume X — 100ml',        marca: 'Marca Premium',  categoria: 'Perfumes',     barcode: '7891234500001', lote: 'LT-2026-004', fab: '2026-01-15', origem: 'Fábrica SP' },
      { nome: 'Medicamento Z — 500mg',     marca: 'Pharma Brasil',  categoria: 'Medicamentos', barcode: '7891234500002', lote: 'LT-2026-018', fab: '2026-02-03', origem: 'Laboratório RJ' },
      { nome: 'Bolsa Luxo — Ed. Limitada', marca: 'LuxBrand',       categoria: 'Luxo',         barcode: '7891234500003', lote: 'LT-2026-007', fab: '2026-01-20', origem: 'Importado' },
      { nome: 'Eletrônico X — 128GB',      marca: 'TechBrand',      categoria: 'Eletrônicos',  barcode: '7891234500004', lote: 'LT-2026-021', fab: '2026-03-01', origem: 'Manaus AM' },
    ];

    const produtoIds = [];
    for (const p of produtos) {
      await conn.query(`
        INSERT INTO produtos (nome, marca, categoria, codigo_barras, lote, data_fabricacao, local_origem)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE nome = VALUES(nome);
      `, [p.nome, p.marca, p.categoria, p.barcode, p.lote, p.fab, p.origem]);
      const [rows] = await conn.query('SELECT id FROM produtos WHERE codigo_barras = ?', [p.barcode]);
      produtoIds.push(rows[0].id);
    }
    

    const qrcodes = [
      { codigo: 'SARA-2026-00142-OK',    prodIdx: 0, vendido: 1 },
      { codigo: 'SARA-2026-00089-OK',    prodIdx: 1, vendido: 1 },
      { codigo: 'SARA-2026-00031-FRAUD', prodIdx: 2, vendido: 1 },
      { codigo: 'SARA-2026-00077-FRAUD', prodIdx: 3, vendido: 1 },
    ];

    const qrcodeIds = [];
    for (const q of qrcodes) {
      await conn.query(`
        INSERT INTO qrcodes (codigo, produto_id, status, vendido)
        VALUES (?, ?, 'ativo', ?)
        ON DUPLICATE KEY UPDATE codigo = codigo;
      `, [q.codigo, produtoIds[q.prodIdx], q.vendido]);
      const [rows] = await conn.query('SELECT id FROM qrcodes WHERE codigo = ?', [q.codigo]);
      qrcodeIds.push(rows[0].id);
    }

    await conn.query(`
      INSERT IGNORE INTO registros_venda (qrcode_id, produto_id, data_venda, local_venda, vendedor)
      VALUES (?, ?, '2026-03-10', 'Loja Y — São Paulo, SP', 'Loja Y');
    `, [qrcodeIds[0], produtoIds[0]]);

    await conn.query(`
      INSERT IGNORE INTO registros_venda (qrcode_id, produto_id, data_venda, local_venda, vendedor)
      VALUES (?, ?, '2026-03-22', 'Farmácia Central — Rio de Janeiro, RJ', 'Farmácia Central');
    `, [qrcodeIds[1], produtoIds[1]]);

    for (let i = 0; i < 4; i++) {
      await conn.query(`
        INSERT INTO log_verificacoes (qrcode_id, codigo, resultado, ip_origem)
        VALUES (?, 'SARA-2026-00031-FRAUD', 'fraude', '192.168.0.1');
      `, [qrcodeIds[2]]);
    }
    for (let i = 0; i < 7; i++) {
      await conn.query(`
        INSERT INTO log_verificacoes (qrcode_id, codigo, resultado, ip_origem)
        VALUES (?, 'SARA-2026-00077-FRAUD', 'fraude', '10.0.0.2');
      `, [qrcodeIds[3]]);
    }

    await conn.query('COMMIT');
    console.log('[SEED] ✅ concluído');
  } catch (err) {
    await conn.query('ROLLBACK');
    console.error('[SEED] erro:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
}

seed();
