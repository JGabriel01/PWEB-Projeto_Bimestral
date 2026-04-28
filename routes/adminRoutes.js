const express = require('express');
const bcrypt = require('bcrypt');
const Membro = require('../models/Membro');

const router = express.Router();

// --- ROTA PARA CRIAR ADMIN (DEVE SER FEITA UMA ÚNICA VEZ) ---
// POST /criar-admin - Criar um membro admin
router.post('/criar-admin', async (req, res) => {
    try {
        const { nome, email, senha, endereco } = req.body;

        // Validação básica
        if (!nome || !email || !senha) {
            return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
        }

        // Verificar se o email já existe
        const membroExistente = await Membro.findOne({ where: { email } });
        if (membroExistente) {
            return res.status(400).json({ erro: 'Email já cadastrado' });
        }

        // Criar membro com role 'admin'
        const membro = await Membro.create({
            nome,
            email,
            senha, // A senha é automaticamente hasheada pelo hook beforeCreate
            endereco, // Opcional
            role: 'admin'
        });

        res.status(201).json({ 
            mensagem: 'Admin criado com sucesso',
            membro: {
                id: membro.id,
                nome: membro.nome,
                email: membro.email,
                endereco: membro.endereco,
                role: membro.role
            }
        });
    } catch (error) {
        console.error('Erro ao criar admin:', error);
        res.status(500).json({ erro: error.message || 'Erro no servidor' });
    }
});

module.exports = router;
