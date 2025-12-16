const express = require('express');
const router = express.Router();
// Certifique-se de que o caminho abaixo está correto para o seu projeto
const membroController = require('../controllers/membroController'); 

// [GET] /membros - Listar todos
router.get('/', membroController.listarMembros);

// [GET] /membros/:id - Buscar por ID
router.get('/:id', membroController.buscarMembroPorId);

// [POST] /membros - Criar novo
router.post('/', membroController.criarMembro);

// [PUT] /membros/:id - Atualizar (Completo)
router.put('/:id', membroController.atualizarMembro);

// [PATCH] /membros/:id - Atualizar (Parcial) ⬅️ NOVO
router.patch('/:id', membroController.atualizarParcialMembro); 

// [DELETE] /membros/:id - Deletar
router.delete('/:id', membroController.deletarMembro);

module.exports = router;