const express = require('express');
const Autor = require('../models/Autor');
const { autenticar, autenticarAdmin } = require('../middleware/autenticacao');
const router = express.Router();

router.get('/autores', async (req, res) => res.json(await Autor.findAll()));

router.get('/autores/:id', async (req, res) => {
    const autor = await Autor.findByPk(req.params.id);
    autor ? res.json(autor) : res.status(404).json({ erro: "Autor não encontrado" });
});

router.post('/autores', autenticarAdmin, async (req, res) => {
    try { res.status(201).json(await Autor.create(req.body)); } 
    catch (e) { res.status(400).json({ erro: e.message }); }
});

router.put('/autores/:id', autenticarAdmin, async (req, res) => {
    try {
        const { nome, dataNascimento, nacionalidade } = req.body;
        const autor = await Autor.findByPk(req.params.id);
        if (!autor) return res.status(404).json({ erro: "Não encontrado" });
        await autor.update({ nome, dataNascimento, nacionalidade });
        res.json(autor);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

router.patch('/autores/:id', autenticarAdmin, async (req, res) => {
    try {
        const autor = await Autor.findByPk(req.params.id);
        if (!autor) return res.status(404).json({ erro: "Não encontrado" });
        await autor.update(req.body);
        res.json(autor);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

router.delete('/autores/:id', autenticarAdmin, async (req, res) => {
    try {
        const deletado = await Autor.destroy({ where: { id: req.params.id } });
        deletado ? res.status(204).send() : res.status(404).json({ erro: "Não encontrado" });
    } catch (e) { res.status(400).json({ erro: "Autor possui livros vinculados." }); }
});

module.exports = router;