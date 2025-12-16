const express = require('express');
const Membro = require('../models/Membro');
const router = express.Router();

router.post('/membros', async (req, res) => res.status(201).json(await Membro.create(req.body)));
router.get('/membros', async (req, res) => res.json(await Membro.findAll()));
router.put('/membros/:id', async (req, res) => {
  const m = await Membro.findByPk(req.params.id);
  if (m) await m.update(req.body);
  res.json(m);
});

module.exports = router;