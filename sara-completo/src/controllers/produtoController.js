const pool   = require('../config/database');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

function gerarCodigoSara() {
  const ano = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  const uid = uuidv4().split('-')[0].toUpperCase();
  return `SARA-${ano}-${num}-${uid}`;
}

async function registrar(req, res) {
  const { nome, marca, categoria, codigo_barras, lote, data_fabricacao, local_origem, descricao } = req.body;
  if (!nome || !marca || !codigo_barras || !lote || !data_fabricacao) {
    return res.status(400).json({ erro: 'Campos obrigatórios: nome, marca, codigo_barras, lote, data_fabricacao.' });
  }
  const client = await pool.connect();
  try {
    await client.query('START TRANSACTION');

    await client.query(`
      INSERT INTO produtos (nome, marca, categoria, codigo_barras, lote, data_fabricacao, local_origem, descricao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `, [nome, marca, categoria || null, codigo_barras, lote, data_fabricacao, local_origem || null, descricao || null]);

    const resProduto = await client.query('SELECT * FROM produtos WHERE codigo_barras = ?', [codigo_barras]);
    const produto = resProduto.rows[0];

    const codigoQR = gerarCodigoSara();
    const urlVerificacao = `${process.env.BASE_URL}/api/verificar/${codigoQR}`;

    await client.query(`
      INSERT INTO qrcodes (codigo, produto_id, status) VALUES (?, ?, 'ativo');
    `, [codigoQR, produto.id]);

    const imagemQR = await QRCode.toDataURL(urlVerificacao, { width: 300, margin: 2 });

    await client.query('COMMIT');
    return res.status(201).json({
      mensagem: 'Produto registrado com sucesso.',
      produto,
      qrcode: { codigo: codigoQR, url_verificacao: urlVerificacao, imagem_base64: imagemQR },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Código de barras já cadastrado.' });
    }
    console.error('[PRODUTO] Erro ao registrar:', err.message);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
}

async function listar(req, res) {
  const { page = 1, limit = 20, categoria, busca } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (categoria) { params.push(categoria); where += ' AND p.categoria = ?'; }
    if (busca)     { params.push(`%${busca}%`, `%${busca}%`); where += ' AND (p.nome LIKE ? OR p.marca LIKE ?)'; }

    const countResult = await pool.query(`SELECT COUNT(*) AS total FROM produtos p ${where}`, params);
    const total = Number(countResult.rows[0].total);

    params.push(Number(limit), Number(offset));
    const result = await pool.query(`
      SELECT p.*, q.codigo AS qrcode, q.vendido, q.status AS qr_status
      FROM produtos p
      LEFT JOIN qrcodes q ON q.produto_id = p.id
      ${where}
      ORDER BY p.criado_em DESC
      LIMIT ? OFFSET ?;
    `, params);

    return res.json({
      produtos: result.rows,
      paginacao: { pagina: Number(page), limite: Number(limit), total },
    });
  } catch (err) {
    console.error('[PRODUTO] Erro ao listar:', err.message);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

async function buscarPorId(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT p.*, q.codigo AS qrcode, q.vendido, q.status AS qr_status, q.criado_em AS qr_criado_em
      FROM produtos p
      LEFT JOIN qrcodes q ON q.produto_id = p.id
      WHERE p.id = ?;
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { registrar, listar, buscarPorId };
