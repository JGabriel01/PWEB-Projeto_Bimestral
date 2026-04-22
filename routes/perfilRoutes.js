const express = require('express');
const Membro = require('../models/Membro');
const { autenticar } = require('../middleware/autenticacao');
const router = express.Router();

// GET /perfil - Rota protegida que retorna dados do usuário autenticado
router.get('/perfil', autenticar, async (req, res) => {
    try {
        // req.usuario contém os dados do token (id, nome, email)
        const membro = await Membro.findByPk(req.usuario.id);

        if (!membro) {
            return res.status(404).json({ erro: 'Membro não encontrado' });
        }

        res.json({
            id: membro.id,
            nome: membro.nome,
            email: membro.email,
            endereco: membro.endereco
        });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

module.exports = router;
