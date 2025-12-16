const express = require('express');
const router = express.Router();
const Emprestimo = require('../models/Emprestimo');
const Livro = require('../models/Livro');
const Membro = require('../models/Membro');
const sequelize = require('../database/db');

// GET ALL
router.get('/emprestimos', async (req, res) => {
    res.json(await Emprestimo.findAll({ include: [{ all: true }] }));
});

// GET ONE
router.get('/emprestimos/:id', async (req, res) => {
    const emp = await Emprestimo.findByPk(req.params.id, { include: [{ all: true }] });
    emp ? res.json(emp) : res.status(404).json({ erro: "Empréstimo não encontrado" });
});

// POST - Criar com validação de existência e estoque
router.post('/emprestimos', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { livroId, membroId } = req.body;

        const livro = await Livro.findByPk(livroId);
        const membro = await Membro.findByPk(membroId);

        if (!livro) return res.status(404).json({ erro: "Livro não encontrado." });
        if (!membro) return res.status(404).json({ erro: "Membro não encontrado." });
        if (livro.qtdDisponivel <= 0) return res.status(400).json({ erro: "Livro sem estoque." });

        const emp = await Emprestimo.create(req.body, { transaction: t });
        await livro.update({ qtdDisponivel: livro.qtdDisponivel - 1 }, { transaction: t });
        
        await t.commit();
        res.status(201).json(emp);
    } catch (e) { await t.rollback(); res.status(400).json({ erro: e.message }); }
});

// PUT - Atualização Total (Exige todos os campos e valida IDs)
router.put('/emprestimos/:id', async (req, res) => {
    try {
        const { livroId, membroId, tempoMinDevolucao, tempoMaxDevolucao } = req.body;
        const emp = await Emprestimo.findByPk(req.params.id);
        if (!emp) return res.status(404).json({ erro: "Empréstimo não encontrado" });

        // Validação de IDs no PUT (obrigatórios)
        const livro = await Livro.findByPk(livroId);
        const membro = await Membro.findByPk(membroId);

        if (!livro) return res.status(404).json({ erro: "ID de Livro inválido no PUT." });
        if (!membro) return res.status(404).json({ erro: "ID de Membro inválido no PUT." });

        await emp.update({ livroId, membroId, tempoMinDevolucao, tempoMaxDevolucao });
        res.json(emp);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

// PATCH - Atualização Parcial (Valida IDs apenas se forem enviados)
router.patch('/emprestimos/:id', async (req, res) => {
    try {
        const emp = await Emprestimo.findByPk(req.params.id);
        if (!emp) return res.status(404).json({ erro: "Empréstimo não encontrado" });

        // Validação se o livroId for enviado no corpo do PATCH
        if (req.body.livroId) {
            const livro = await Livro.findByPk(req.body.livroId);
            if (!livro) return res.status(404).json({ erro: "Novo ID de Livro é inválido." });
        }

        // Validação se o membroId for enviado no corpo do PATCH
        if (req.body.membroId) {
            const membro = await Membro.findByPk(req.body.membroId);
            if (!membro) return res.status(404).json({ erro: "Novo ID de Membro é inválido." });
        }

        await emp.update(req.body);
        res.json(emp);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

// DELETE - Devolução
router.delete('/emprestimos/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const emp = await Emprestimo.findByPk(req.params.id);
        if (!emp) return res.status(404).json({ erro: "Empréstimo não encontrado" });

        const livro = await Livro.findByPk(emp.livroId);
        if (livro) await livro.update({ qtdDisponivel: livro.qtdDisponivel + 1 }, { transaction: t });

        await emp.destroy({ transaction: t });
        await t.commit();
        res.status(204).send();
    } catch (e) { await t.rollback(); res.status(500).json({ erro: e.message }); }
});

module.exports = router;