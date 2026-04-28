const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Membro = require('../models/Membro');

const router = express.Router();

// --- ROTA DE AUTENTICAÇÃO (PÚBLICA) ---
// POST /login - Rota para gerar token JWT com Membro real
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Validação básica
        if (!email || !senha) {
            return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
        }

        // Buscar membro no banco de dados
        const membro = await Membro.findOne({ where: { email } });

        if (!membro) {
            return res.status(401).json({ erro: 'Credenciais inválidas' });
        }

        // Comparar senha com bcrypt
        const senhaValida = await bcrypt.compare(senha, membro.senha);

        if (!senhaValida) {
            return res.status(401).json({ erro: 'Credenciais inválidas' });
        }

        // Gerar token JWT com dados reais do membro
        const token = jwt.sign(
            { 
                id: membro.id,
                nome: membro.nome,
                email: membro.email,
                role: membro.role,
                iat: Math.floor(Date.now() / 1000)
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({ 
            token,
            membro: {
                id: membro.id,
                nome: membro.nome,
                email: membro.email,
                role: membro.role
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

module.exports = router;
