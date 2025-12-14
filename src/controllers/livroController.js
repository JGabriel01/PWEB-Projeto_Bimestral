const pool = require('../config/db');

// Função de utilidade para verificar a existência do autor
async function checkAutorExists(autorId) {
    const [rows] = await pool.query('SELECT id FROM autores WHERE id = ?', [autorId]);
    return rows.length > 0;
}

// @GET /api/livros
exports.getAllLivros = async (req, res) => {
    try {
        // JOIN para trazer o nome do autor junto
        const [rows] = await pool.query(`
            SELECT 
                l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel, l.autorId,
                a.nome AS nomeAutor, a.nacionalidade AS nacionalidadeAutor
            FROM livros l
            JOIN autores a ON l.autorId = a.id
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar livros:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// @GET /api/livros/:id
exports.getLivroById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT 
                l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel, l.autorId,
                a.nome AS nomeAutor
            FROM livros l
            JOIN autores a ON l.autorId = a.id
            WHERE l.id = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Livro não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`Erro ao buscar livro ID ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// @POST /api/livros
exports.createLivro = async (req, res) => {
    const { titulo, anoPublicacao, qtdDisponivel, autorId } = req.body;

    if (!titulo || !autorId) {
        return res.status(400).json({ message: 'Título e autorId são obrigatórios.' });
    }

    try {
        // **Validação do autorId**
        const autorExiste = await checkAutorExists(autorId);
        if (!autorExiste) {
            return res.status(404).json({ message: `Autor com ID ${autorId} não encontrado.` });
        }

        const [result] = await pool.query(
            'INSERT INTO livros (titulo, anoPublicacao, qtdDisponivel, autorId) VALUES (?, ?, ?, ?)',
            [titulo, anoPublicacao, qtdDisponivel, autorId]
        );
        res.status(201).json({ id: result.insertId, titulo, anoPublicacao, qtdDisponivel, autorId });
    } catch (error) {
        console.error('Erro ao criar livro:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao criar livro.' });
    }
};

// @PUT /api/livros/:id
exports.updateLivro = async (req, res) => {
    const { id } = req.params;
    const { titulo, anoPublicacao, qtdDisponivel, autorId } = req.body;

    if (!titulo || !autorId) {
        return res.status(400).json({ message: 'Título e autorId são obrigatórios.' });
    }

    try {
        // **Validação do autorId**
        const autorExiste = await checkAutorExists(autorId);
        if (!autorExiste) {
            return res.status(404).json({ message: `Autor com ID ${autorId} não encontrado.` });
        }

        const [result] = await pool.query(
            'UPDATE livros SET titulo = ?, anoPublicacao = ?, qtdDisponivel = ?, autorId = ? WHERE id = ?',
            [titulo, anoPublicacao, qtdDisponivel, autorId, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Livro não encontrado para atualização.' });
        }

        res.status(200).json({ id, titulo, anoPublicacao, qtdDisponivel, autorId });
    } catch (error) {
        console.error(`Erro ao atualizar livro ID ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar livro.' });
    }
};

// @DELETE /api/livros/:id
exports.deleteLivro = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM livros WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Livro não encontrado para exclusão.' });
        }

        res.status(204).send(); // No Content
    } catch (error) {
        console.error(`Erro ao deletar livro ID ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor ao deletar livro.' });
    }
};