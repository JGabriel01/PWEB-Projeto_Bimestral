const express = require('express');
const Livro = require('../models/Livro');
const Autor = require('../models/Autor');
const router = express.Router();

router.get('/livros', async (req, res) => res.json(await Livro.findAll({ include: 'autores' })));

router.get('/livros/:id', async (req, res) => {
    const livro = await Livro.findByPk(req.params.id, { include: 'autores' });
    livro ? res.json(livro) : res.status(404).json({ erro: "Livro não encontrado" });
});

// POST - Criar Livro
router.post('/livros', async (req, res) => {
    try {
        const { titulo, anoPublicacao, qtdDisponivel, autorIds } = req.body;
        
        if (!Array.isArray(autorIds) || autorIds.length === 0) {
            return res.status(400).json({ erro: "autorIds deve ser um array preenchido." });
        }

        const autores = await Autor.findAll({ where: { id: autorIds } });
        
        // VALIDAÇÃO CRUCIAL: Compara a quantidade encontrada com a solicitada
        if (autores.length !== autorIds.length) {
            return res.status(404).json({ erro: "Um ou mais IDs de autores são inválidos." });
        }

        const novoLivro = await Livro.create({ titulo, anoPublicacao, qtdDisponivel });
        await novoLivro.setAutores(autores);
        res.status(201).json(novoLivro);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

// PUT - Atualização Total
router.put('/livros/:id', async (req, res) => {
    try {
        const { titulo, anoPublicacao, qtdDisponivel, autorIds } = req.body;
        const livro = await Livro.findByPk(req.params.id);
        if (!livro) return res.status(404).json({ erro: "Livro não encontrado" });

        if (!Array.isArray(autorIds)) return res.status(400).json({ erro: "autorIds é obrigatório no PUT." });

        const autores = await Autor.findAll({ where: { id: autorIds } });
        
        // VALIDAÇÃO CRUCIAL: Bloqueia se algum ID no array não existir
        if (autores.length !== autorIds.length) {
            return res.status(404).json({ erro: "IDs de autores inválidos detectados." });
        }

        await livro.update({ titulo, anoPublicacao, qtdDisponivel });
        await livro.setAutores(autores);
        res.json(livro);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

// PATCH - Atualização Parcial
router.patch('/livros/:id', async (req, res) => {
    try {
        const livro = await Livro.findByPk(req.params.id);
        if (!livro) return res.status(404).json({ erro: "Livro não encontrado" });

        if (req.body.autorIds) {
            if (!Array.isArray(req.body.autorIds)) return res.status(400).json({ erro: "autorIds deve ser um array." });
            
            const autores = await Autor.findAll({ where: { id: req.body.autorIds } });
            
            // VALIDAÇÃO CRUCIAL
            if (autores.length !== req.body.autorIds.length) {
                return res.status(404).json({ erro: "IDs de autores inválidos detectados no PATCH." });
            }
            await livro.setAutores(autores);
        }

        await livro.update(req.body);
        res.json(livro);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

router.delete('/livros/:id', async (req, res) => {
    try {
        const deletado = await Livro.destroy({ where: { id: req.params.id } });
        deletado ? res.status(204).send() : res.status(404).json({ erro: "Livro não encontrado" });
    } catch (e) { res.status(400).json({ erro: "Restrição de integridade: Livro possui empréstimos." }); }
});

module.exports = router;