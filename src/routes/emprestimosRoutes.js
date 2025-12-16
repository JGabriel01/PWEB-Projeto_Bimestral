const express = require('express');
const router = express.Router();
// Ajuste o caminho conforme a estrutura do seu projeto
const emprestimoController = require('../controllers/emprestimoController'); 

// Rotas CRUD para Empréstimos

// [GET] /emprestimos - Listar todos
router.get('/', emprestimoController.listarEmprestimos);

// [GET] /emprestimos/:id - Buscar por ID
router.get('/:id', emprestimoController.buscarEmprestimoPorId);

// [POST] /emprestimos - Criar novo Empréstimo (Transação: Retirada de estoque)
router.post('/', emprestimoController.createEmprestimo);

// [PUT] /emprestimos/:id - Atualizar Completo (Transação)
router.put('/:id', emprestimoController.atualizarEmprestimo);

// [PATCH] /emprestimos/:id - Atualizar Parcial (Transação)
router.patch('/:id', emprestimoController.atualizarParcialEmprestimo); 

// [DELETE] /emprestimos/:id - Devolução/Remoção do Empréstimo (Transação: Devolução ao estoque)
router.delete('/:id', emprestimoController.deletarEmprestimo);

module.exports = router;