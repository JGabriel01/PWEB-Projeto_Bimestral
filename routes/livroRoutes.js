const express = require('express');
const Livro = require('../models/Livro');
const router = express.Router();

router.get('/livros', async (req, res) => res.json(await Livro.findAll()));
router.post('/livros', async (req, res) => res.status(201).json(await Livro.create(req.body)));
router.patch('/livros/:id', async (req, res) => {
  const l = await Livro.findByPk(req.params.id);
  if (l) await l.update(req.body);
  res.json(l);
});
router.delete('/livros/:id', async (req, res) => {
  await Livro.destroy({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;