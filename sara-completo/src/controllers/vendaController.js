const pool = require('../config/database');

async function registrar(req, res) {
  const { codigo_barras, local_venda, vendedor, observacao } = req.body;
  if (!codigo_barras || !local_venda) {
    return res.status(400).json({ erro: 'Campos obrigatórios: codigo_barras, local_venda.' });
  }
  const client = await pool.connect();
  try {
    await client.query('START TRANSACTION');

    const resProd = await client.query(`
      SELECT p.id AS produto_id, p.nome, p.marca,
             q.id AS qrcode_id, q.codigo, q.vendido
      FROM produtos p
      JOIN qrcodes q ON q.produto_id = p.id
      WHERE p.codigo_barras = ?
      LIMIT 1;
    `, [codigo_barras]);

    if (resProd.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Produto não encontrado. Código de barras não cadastrado.' });
    }

    const item = resProd.rows[0];

    if (item.vendido) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        erro:    'Produto já foi registrado como vendido anteriormente.',
        alerta:  'POSSÍVEL FRAUDE — embalagem pode estar sendo reutilizada.',
        produto: { nome: item.nome, marca: item.marca, qrcode: item.codigo },
      });
    }

    await client.query(`
      INSERT INTO registros_venda (qrcode_id, produto_id, local_venda, vendedor, observacao)
      VALUES (?, ?, ?, ?, ?);
    `, [item.qrcode_id, item.produto_id, local_venda, vendedor || null, observacao || null]);

    const resVenda = await client.query('SELECT * FROM registros_venda WHERE qrcode_id = ? ORDER BY id DESC LIMIT 1', [item.qrcode_id]);

    await client.query('UPDATE qrcodes SET vendido = 1 WHERE id = ?', [item.qrcode_id]);

    await client.query('COMMIT');
    return res.status(201).json({
      mensagem: 'Venda registrada com sucesso.',
      venda: resVenda.rows[0],
      produto: { nome: item.nome, marca: item.marca, qrcode: item.codigo },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[VENDA] Erro ao registrar:', err.message);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
}

async function historico(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const countResult = await pool.query('SELECT COUNT(*) AS total FROM registros_venda');
    const total = Number(countResult.rows[0].total);

    const result = await pool.query(`
      SELECT rv.*, p.nome AS produto_nome, p.marca, q.codigo AS qrcode
      FROM registros_venda rv
      JOIN produtos p ON p.id = rv.produto_id
      JOIN qrcodes  q ON q.id = rv.qrcode_id
      ORDER BY rv.data_venda DESC
      LIMIT ? OFFSET ?;
    `, [Number(limit), Number(offset)]);

    return res.json({
      vendas:    result.rows,
      paginacao: { pagina: Number(page), limite: Number(limit), total },
    });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { registrar, historico };
