// O caminho do pool deve ser corrigido de acordo com a estrutura do seu projeto.
// Exemplo: Se 'config' está na raiz do projeto e o controller em src/controllers
const pool = require('../config/db'); 

// ------------------------------------
// ENTIDADE: MEMBROS (nome, email, endereco)
// ------------------------------------

// @GET /api/membros - Listar todos os membros
exports.listarMembros = async (req, res) => {
    try {
        // Seleciona todos os campos existentes na tabela 'membros' (sem 'data_cadastro')
        const [rows] = await pool.query('SELECT id, nome, email, endereco FROM membros');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao listar membros:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// @GET /api/membros/:id - Buscar membro por ID
exports.buscarMembroPorId = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT id, nome, email, endereco FROM membros WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Membro não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`Erro ao buscar membro ID ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// @POST /api/membros - Criar novo membro
exports.criarMembro = async (req, res) => {
    // Endereço é obrigatório, conforme seu esquema SQL anterior
    const { nome, email, endereco } = req.body; 

    if (!nome || !email || !endereco) {
        return res.status(400).json({ message: 'Nome, email e endereço são obrigatórios.' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO membros (nome, email, endereco) VALUES (?, ?, ?)',
            [nome, email, endereco]
        );
        res.status(201).json({ id: result.insertId, nome, email, endereco });
    } catch (error) {
        console.error('Erro ao criar membro:', error);
        // Trata erro de email duplicado (UNIQUE)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'O email fornecido já está cadastrado.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor ao criar membro.' });
    }
};

// @PUT /api/membros/:id - Atualização completa (todos os campos obrigatórios)
exports.atualizarMembro = async (req, res) => {
    const { id } = req.params;
    const { nome, email, endereco } = req.body;

    if (!nome || !email || !endereco) {
        return res.status(400).json({ message: 'Nome, email e endereço são obrigatórios para a atualização PUT.' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE membros SET nome = ?, email = ?, endereco = ? WHERE id = ?',
            [nome, email, endereco, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Membro não encontrado para atualização.' });
        }

        res.status(200).json({ id, nome, email, endereco });
    } catch (error) {
        console.error(`Erro ao atualizar membro ID ${id}:`, error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'O email fornecido já está em uso por outro membro.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar membro.' });
    }
};

// @PATCH /api/membros/:id - Atualização parcial (apenas os campos fornecidos)
exports.atualizarParcialMembro = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'Nenhum campo fornecido para atualização parcial.' });
    }
    
    // Define quais campos do Body são permitidos para atualização
    const camposPermitidos = ['nome', 'email', 'endereco'];

    try {
        const fields = [];
        const values = [];

        for (const key in updates) {
            if (camposPermitidos.includes(key) && updates.hasOwnProperty(key)) {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        }
        
        // Se após a filtragem não sobrar campos válidos, retorna 400
        if (fields.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo válido fornecido para atualização.' });
        }

        values.push(id); 

        const query = `UPDATE membros SET ${fields.join(', ')} WHERE id = ?`;

        const [result] = await pool.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Membro não encontrado para atualização parcial.' });
        }
        
        // Retorna o membro atualizado (busca no DB)
        const [rows] = await pool.query('SELECT id, nome, email, endereco FROM membros WHERE id = ?', [id]);
        res.status(200).json(rows[0]);

    } catch (error) {
        console.error(`Erro ao atualizar parcialmente o membro ID ${id}:`, error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'O email fornecido já está em uso por outro membro.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// @DELETE /api/membros/:id - Deletar um membro
exports.deletarMembro = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM membros WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Membro não encontrado para exclusão.' });
        }

        res.status(204).send(); // Sucesso sem conteúdo de retorno
    } catch (error) {
        console.error(`Erro ao deletar membro ID ${id}:`, error);
        // Trata erro de Chave Estrangeira (se o membro ainda tiver empréstimos)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(409).json({ message: 'Não é possível excluir o membro. Existem empréstimos associados a ele.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor ao deletar membro.' });
    }
};