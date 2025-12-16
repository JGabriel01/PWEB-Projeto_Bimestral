const express = require('express');
const Emprestimo = require('../models/Emprestimo');
const Livro = require('../models/Livro');
const sequelize = require('../database/db');
const router = express.Router();

router.post('/emprestimos', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { livroId, membroId, tempoMin, tempoMax } = req.body;
    const livro = await Livro.findByPk(livroId);
    if (!livro || livro.qtdDisponivel <= 0) throw new Error("Estoque zerado");

    const emp = await Emprestimo.create({ livroId, membroId, tempoMinDevolucao: tempoMin, tempoMaxDevolucao: tempoMax }, { transaction: t });
    await livro.update({ qtdDisponivel: livro.qtdDisponivel - 1 }, { transaction: t });
    
    await t.commit();
    res.status(201).json(emp);
  } catch (e) {
    await t.rollback();
    res.status(400).json({ erro: e.message });
  }
});

router.get('/emprestimos', async (req, res) => res.json(await Emprestimo.findAll()));

module.exports = router;