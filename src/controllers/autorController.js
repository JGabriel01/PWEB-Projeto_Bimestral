const pool = require('../config/db');

// @GET /api/autores
exports.getAllAutores = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM autores');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar autores:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// @GET /api/autores/:id
exports.getAutorById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM autores WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Autor não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`Erro ao buscar autor ID ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// @POST /api/autores
exports.createAutor = async (req, res) => {
    const { nome, dataNascimento, nacionalidade } = req.body;

    if (!nome || !dataNascimento) {
        return res.status(400).json({ message: 'Nome e dataNascimento são obrigatórios.' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO autores (nome, dataNascimento, nacionalidade) VALUES (?, ?, ?)',
            [nome, dataNascimento, nacionalidade]
        );
        res.status(201).json({ id: result.insertId, nome, dataNascimento, nacionalidade });
    } catch (error) {
        console.error('Erro ao criar autor:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao criar autor.' });
    }
};

// @PUT /api/autores/:id
exports.updateAutor = async (req, res) => {
    const { id } = req.params;
    const { nome, dataNascimento, nacionalidade } = req.body;

    if (!nome || !dataNascimento) {
        return res.status(400).json({ message: 'Nome e dataNascimento são obrigatórios.' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE autores SET nome = ?, dataNascimento = ?, nacionalidade = ? WHERE id = ?',
            [nome, dataNascimento, nacionalidade, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Autor não encontrado para atualização.' });
        }

        res.status(200).json({ id, nome, dataNascimento, nacionalidade });
    } catch (error) {
        console.error(`Erro ao atualizar autor ID ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar autor.' });
    }
};

// @PATCH /api/autores/:id
exports.patchAutor = async (req, res) => {
    const { id } = req.params;
    const updates = req.body; // Pega todos os campos enviados

    // Se nenhum campo foi enviado, retorna erro 400
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'Nenhum campo fornecido para atualização.' });
    }

    try {
        // 1. Constrói a query de forma dinâmica
        const fields = [];
        const values = [];

        // Itera sobre os campos no body da requisição
        for (const key in updates) {
            if (updates.hasOwnProperty(key)) {
                // Adiciona o campo e um placeholder '?'
                fields.push(`${key} = ?`);
                // Adiciona o valor correspondente
                values.push(updates[key]);
            }
        }

        // Adiciona o ID do autor ao final dos valores
        values.push(id); 

        const query = `UPDATE autores SET ${fields.join(', ')} WHERE id = ?`;

        const [result] = await pool.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Autor não encontrado para atualização parcial.' });
        }
        
        // 2. Opcional: Retorna o autor atualizado
        const [rows] = await pool.query('SELECT * FROM autores WHERE id = ?', [id]);
        res.status(200).json(rows[0]);

    } catch (error) {
        console.error(`Erro ao atualizar parcialmente o autor ID ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar parcialmente o autor.' });
    }
};

// @DELETE /api/autores/:id
exports.deleteAutor = async (req, res) => {
    const { id } = req.params;
    try {
        // Antes de deletar o autor, você pode verificar se existem livros associados
        // Se houver, a restrição de chave estrangeira deve impedir a exclusão, 
        // ou você pode deletar os livros primeiro (depende da regra de negócio).
        
        const [result] = await pool.query('DELETE FROM autores WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Autor não encontrado para exclusão.' });
        }

        res.status(204).send(); // No Content
    } catch (error) {
        // Este erro pode ser um erro de FK (Foreign Key constraint)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(409).json({ message: 'Não é possível excluir o autor. Existem livros associados a ele.' });
        }
        console.error(`Erro ao deletar autor ID ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor ao deletar autor.' });
    }
};