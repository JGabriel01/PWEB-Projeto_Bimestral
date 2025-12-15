const pool = require('../config/db');

// Função de utilidade para verificar a existência do autor
async function checkAutorExists(autorId) {
    const [rows] = await pool.query('SELECT id FROM autores WHERE id = ?', [autorId]);
    return rows.length > 0;
}

// Verifica se TODOS os IDs no array existem
async function checkAutoresExists(autorIds) {
    if (!autorIds || autorIds.length === 0) return false;

    // Constrói uma string de placeholders (? , ? , ? ...)
    const placeholders = autorIds.map(() => '?').join(', ');
    
    // Conta quantos IDs únicos foram encontrados
    const [rows] = await pool.query(
        `SELECT COUNT(DISTINCT id) AS count FROM autores WHERE id IN (${placeholders})`, 
        autorIds
    );
    
    // Retorna true se o número de IDs únicos encontrados for igual ao número de IDs fornecidos
    return rows[0].count === autorIds.length;
}

// @GET /api/livros (ATUALIZADO PARA N:N)
exports.getAllLivros = async (req, res) => {
    try {
        const query = `
            SELECT 
                l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', a.id, 
                        'nome', a.nome
                    )
                ) AS autores
            FROM livros l
            JOIN livro_autor la ON l.id = la.livro_id
            JOIN autores a ON la.autor_id = a.id
            GROUP BY l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel
        `;
        const [rows] = await pool.query(query);

        // Parseia o campo 'autores' que vem como string JSON
        const livrosComAutores = rows.map(livro => ({
            ...livro,
            autores: JSON.parse(livro.autores)
        }));

        res.status(200).json(livrosComAutores);
    } catch (error) {
        console.error('Erro ao buscar livros (N:N):', error);
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

// @PUT /api/livros/:id
exports.updateLivro = async (req, res) => {
    const { id } = req.params;
    const { titulo, anoPublicacao, qtdDisponivel, autorIds } = req.body;

    // O PUT exige todos os campos
    if (!titulo || !anoPublicacao || !qtdDisponivel || !autorIds || autorIds.length === 0) {
        return res.status(400).json({ message: 'Todos os campos do livro e pelo menos um autorIds são obrigatórios para PUT.' });
    }

    let connection;

    try {
        // Validação dos IDs dos autores
        const todosAutoresExistem = await checkAutoresExists(autorIds);
        if (!todosAutoresExistem) {
            return res.status(404).json({ message: `Um ou mais AutorIds fornecidos não foram encontrados.` });
        }
        
        // --- INÍCIO DA TRANSAÇÃO ---
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Atualiza os dados principais do livro
        const [livroResult] = await connection.query(
            'UPDATE livros SET titulo = ?, anoPublicacao = ?, qtdDisponivel = ? WHERE id = ?',
            [titulo, anoPublicacao, qtdDisponivel, id]
        );

        if (livroResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Livro não encontrado para atualização.' });
        }

        // 2. Apaga as relações antigas na tabela pivô
        await connection.query('DELETE FROM livro_autor WHERE livro_id = ?', [id]);

        // 3. Insere as novas relações
        const relacoes = autorIds.map(autorId => [id, autorId]);
        await connection.query(
            'INSERT INTO livro_autor (livro_id, autor_id) VALUES ?',
            [relacoes]
        );

        // Confirma a transação
        await connection.commit();
        // --- FIM DA TRANSAÇÃO ---

        // 4. Retorna o livro atualizado (usando JOIN)
        const [rows] = await pool.query(`
            SELECT l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel,
            JSON_ARRAYAGG(JSON_OBJECT('id', a.id, 'nome', a.nome)) AS autores
            FROM livros l
            JOIN livro_autor la ON l.id = la.livro_id
            JOIN autores a ON la.autor_id = a.id
            WHERE l.id = ?
            GROUP BY l.id
        `, [id]);
        
        res.status(200).json({...rows[0], autores: JSON.parse(rows[0].autores)});

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Erro ao atualizar livro ID ${id} (PUT):`, error);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar livro.' });
    } finally {
        if (connection) connection.release();
    }
};

// @POST /api/livros (ATUALIZADO PARA N:N)
exports.createLivro = async (req, res) => {
    const { titulo, anoPublicacao, qtdDisponivel, autorIds } = req.body;

    if (!titulo || !autorIds || autorIds.length === 0) {
        return res.status(400).json({ message: 'Título e pelo menos um autorIds são obrigatórios.' });
    }

    let connection;

    try {
        // Validação dos IDs dos autores
        const todosAutoresExistem = await checkAutoresExists(autorIds);
        if (!todosAutoresExistem) {
            return res.status(404).json({ message: `Um ou mais AutorIds fornecidos não foram encontrados.` });
        }
        
        // Inicia a transação
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Insere o livro na tabela `livros`
        const [livroResult] = await connection.query(
            'INSERT INTO livros (titulo, anoPublicacao, qtdDisponivel) VALUES (?, ?, ?)',
            [titulo, anoPublicacao, qtdDisponivel]
        );
        const novoLivroId = livroResult.insertId;

        // 2. Monta o array de valores para a tabela `livro_autor`
        const relacoes = autorIds.map(autorId => [novoLivroId, autorId]);

        // 3. Insere em lote na tabela PIVÔ
        await connection.query(
            'INSERT INTO livro_autor (livro_id, autor_id) VALUES ?',
            [relacoes] // O '?' aqui é um placeholder para um array de arrays
        );

        // Confirma a transação
        await connection.commit();

        res.status(201).json({ 
            id: novoLivroId, 
            titulo, 
            anoPublicacao, 
            qtdDisponivel, 
            autores: autorIds 
        });

    } catch (error) {
        // Se algo falhar, desfaz as operações
        if (connection) await connection.rollback();
        console.error('Erro ao criar livro (N:N):', error);
        res.status(500).json({ message: 'Erro interno do servidor ao criar livro.' });
    } finally {
        if (connection) connection.release();
    }
};

// @PATCH /api/livros/:id
exports.patchLivro = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { autorIds, ...livroUpdates } = updates; // Separa autorIds dos outros campos

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'Nenhum campo fornecido para atualização.' });
    }

    let connection;
    const isRelacaoUpdate = autorIds !== undefined; // Verifica se autorIds foi enviado

    try {
        if (isRelacaoUpdate) {
            // Se autorIds está sendo alterado, ele DEVE ser um array válido e não vazio
            if (!Array.isArray(autorIds) || autorIds.length === 0) {
                return res.status(400).json({ message: 'Se autorIds for fornecido, deve ser um array de IDs de autores não vazio.' });
            }
            
            // Validação dos IDs dos autores
            const todosAutoresExistem = await checkAutoresExists(autorIds);
            if (!todosAutoresExistem) {
                return res.status(404).json({ message: `Um ou mais AutorIds fornecidos não foram encontrados.` });
            }
        }
        
        // --- INÍCIO DA TRANSAÇÃO (só se houver autorIds ou se houver updates no livro) ---
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Atualiza os campos principais do livro (se houver)
        if (Object.keys(livroUpdates).length > 0) {
            const fields = [];
            const values = [];

            for (const key in livroUpdates) {
                fields.push(`${key} = ?`);
                values.push(livroUpdates[key]);
            }

            values.push(id); 

            const query = `UPDATE livros SET ${fields.join(', ')} WHERE id = ?`;
            await connection.query(query, values);
        }

        // 2. Atualiza as relações N:N (se autorIds foi fornecido)
        if (isRelacaoUpdate) {
            // Apaga as relações antigas
            await connection.query('DELETE FROM livro_autor WHERE livro_id = ?', [id]);

            // Insere as novas relações
            const relacoes = autorIds.map(autorId => [id, autorId]);
            await connection.query(
                'INSERT INTO livro_autor (livro_id, autor_id) VALUES ?',
                [relacoes]
            );
        }

        // Confirma a transação
        await connection.commit();
        // --- FIM DA TRANSAÇÃO ---

        // 3. Retorna o livro atualizado completo
        const [rows] = await pool.query(`
            SELECT l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel,
            JSON_ARRAYAGG(JSON_OBJECT('id', a.id, 'nome', a.nome)) AS autores
            FROM livros l
            LEFT JOIN livro_autor la ON l.id = la.livro_id
            LEFT JOIN autores a ON la.autor_id = a.id
            WHERE l.id = ?
            GROUP BY l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel
        `, [id]);
        
        if (rows.length === 0) {
             return res.status(404).json({ message: 'Livro não encontrado após atualização.' });
        }

        res.status(200).json({...rows[0], autores: rows[0].autores ? JSON.parse(rows[0].autores) : []});

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Erro ao atualizar parcialmente o livro ID ${id} (PATCH):`, error);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar livro.' });
    } finally {
        if (connection) connection.release();
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