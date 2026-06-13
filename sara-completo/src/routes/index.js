const express = require('express');
const router  = express.Router();

const auth      = require('../middlewares/auth');
const authCtrl  = require('../controllers/authController');
const prodCtrl  = require('../controllers/produtoController');
const verfCtrl  = require('../controllers/verificacaoController');
const vendCtrl  = require('../controllers/vendaController');

router.post('/auth/login', authCtrl.login);
router.get('/auth/me', auth, authCtrl.me);

router.get('/verificar/:codigo', verfCtrl.verificar);
router.get('/verificar/:codigo/historico', auth, verfCtrl.historico);

router.post('/produtos/registrar', auth, prodCtrl.registrar);
router.get('/produtos', auth, prodCtrl.listar);
router.get('/produtos/:id', auth, prodCtrl.buscarPorId);

router.post('/venda/registrar', auth, vendCtrl.registrar);
router.get('/venda/historico', auth, vendCtrl.historico);

module.exports = router;
