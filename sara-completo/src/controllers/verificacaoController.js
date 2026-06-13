const pool = require('../config/database');

async function verificar(req, res) {
  const { codigo } = req.params;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

  if (!codigo) {
    return res.status(400).json({ erro: 'Código QR é obrigatório.' });
  }

  try {
    const resQR = await pool.query(`
      SELECT
        q.id           AS qrcode_id,
        q.codigo,
        q.status,
        q.vendido,
        p.id           AS produto_id,
        p.nome,
        p.marca,
        p.categoria,
        p.lote,
        p.data_fabricacao,
        p.local_origem,
        rv.data_venda,
        rv.local_venda,
        rv.vendedor
      FROM qrcodes q
      JOIN produtos p ON p.id = q.produto_id
      LEFT JOIN registros_venda rv ON rv.qrcode_id = q.id
      WHERE q.codigo = ?
      LIMIT 1;
    `, [codigo]);

    if (resQR.rows.length === 0) {
      await registrarLog(null, codigo, 'nao_encontrado', ip);
      return res.status(404).json({
        autenticado: false,
        resultado:   'nao_encontrado',
        mensagem:    'Este QR Code não está cadastrado no sistema S.A.R.A.',
        codigo,
      });
    }

    const item = resQR.rows[0];

    const resLog = await pool.query(`
      SELECT COUNT(*) AS total FROM log_verificacoes WHERE qrcode_id = ?;
    `, [item.qrcode_id]);

    const totalScans = Number(resLog.rows[0].total);

    await registrarLog(item.qrcode_id, codigo, item.vendido ? (totalScans > 1 ? 'fraude' : 'original') : 'nao_vendido', ip);

    if (item.vendido && totalScans > 1) {
      return res.json({
        autenticado: false,
        resultado:   'fraude',
        mensagem:    'ALERTA: Este QR Code já foi registrado múltiplas vezes. Possível falsificação ou reutilização de embalagem.',
        codigo,
        produto: { nome: item.nome, marca: item.marca, categoria: item.categoria, lote: item.lote },
        total_verificacoes: totalScans + 1,
      });
    }

    if (!item.vendido) {
      return res.json({
        autenticado: false,
        resultado:   'nao_vendido',
        mensagem:    'Este produto ainda não foi registrado como vendido.',
        codigo,
        produto: { nome: item.nome, marca: item.marca, categoria: item.categoria, lote: item.lote, fabricacao: item.data_fabricacao, origem: item.local_origem },
      });
    }

    return res.json({
      autenticado: true,
      resultado:   'original',
      mensagem:    'Produto autêntico. Origem verificada com sucesso.',
      codigo,
      produto: { nome: item.nome, marca: item.marca, categoria: item.categoria, lote: item.lote, fabricacao: item.data_fabricacao, origem: item.local_origem },
      venda: { data: item.data_venda, local: item.local_venda, vendedor: item.vendedor },
    });
  } catch (err) {
    console.error('[VERIFICAR] Erro:', err.message);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

async function registrarLog(qrcodeId, codigo, resultado, ip) {
  try {
    await pool.query(`
      INSERT INTO log_verificacoes (qrcode_id, codigo, resultado, ip_origem)
      VALUES (?, ?, ?, ?);
    `, [qrcodeId, codigo, resultado, ip]);
  } catch (err) {
    console.error('[LOG] Erro ao registrar log:', err.message);
  }
}

async function historico(req, res) {
  const { codigo } = req.params;
  try {
    const result = await pool.query(`
      SELECT lv.*, q.produto_id
      FROM log_verificacoes lv
      LEFT JOIN qrcodes q ON q.id = lv.qrcode_id
      WHERE lv.codigo = ?
      ORDER BY lv.verificado_em DESC;
    `, [codigo]);
    return res.json({ codigo, total: result.rows.length, registros: result.rows });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { verificar, historico };
