const express = require('express');
const Autor = require('../models/Autor');
const router = express.Router();

router.get('/autores', async (req, res) => res.json(await Autor.findAll()));
router.get('/autores/:id', async (req, res) => res.json(await Autor.findByPk(req.params.id)));
router.post('/autores', async (req, res) => res.status(201).json(await Autor.create(req.body)));
router.put('/autores/:id', async (req, res) => {
  const a = await Autor.findByPk(req.params.id);
  if (a) await a.update(req.body);
  res.json(a);
});
router.delete('/autores/:id', async (req, res) => {
  await Autor.destroy({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;