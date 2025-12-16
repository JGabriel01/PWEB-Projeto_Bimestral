const express = require('express');
const Membro = require('../models/Membro');
const router = express.Router();

router.get('/membros', async (req, res) => res.json(await Membro.findAll()));

router.get('/membros/:id', async (req, res) => {
    const membro = await Membro.findByPk(req.params.id);
    membro ? res.json(membro) : res.status(404).json({ erro: "Membro não encontrado" });
});

router.post('/membros', async (req, res) => {
    try { res.status(201).json(await Membro.create(req.body)); }
    catch (e) { res.status(400).json({ erro: e.message }); }
});

router.put('/membros/:id', async (req, res) => {
    try {
        const { nome, email, senha, endereco } = req.body;
        const membro = await Membro.findByPk(req.params.id);
        if (!membro) return res.status(404).json({ erro: "Não encontrado" });
        await membro.update({ nome, email, senha, endereco });
        res.json(membro);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

router.patch('/membros/:id', async (req, res) => {
    try {
        const membro = await Membro.findByPk(req.params.id);
        if (!membro) return res.status(404).json({ erro: "Não encontrado" });
        await membro.update(req.body);
        res.json(membro);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

router.delete('/membros/:id', async (req, res) => {
    try {
        const deletado = await Membro.destroy({ where: { id: req.params.id } });
        deletado ? res.status(204).send() : res.status(404).json({ erro: "Não encontrado" });
    } catch (e) { res.status(400).json({ erro: "Membro possui empréstimos ativos." }); }
});

module.exports = router;