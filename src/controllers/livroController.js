const pool = require('../config/db');

// Função de utilidade para verificar a existência do autor
async function checkAutorExists(autorIds) {
    const [rows] = await pool.query('SELECT id FROM autores WHERE id = ?', [autorIds]);
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

       const livrosComAutores = rows.map(livro => {
            
            // Tratamento adicional caso o driver MySQL retorne a coluna como string literal
            // 'null' para garantir que é um array, embora o JSON_ARRAYAGG + JOIN deva evitar isso.
            let autoresArray = livro.autores;

            // Se for string, tentamos parsear (caso raro, mas evita o erro se a conversão automática falhar)
            if (typeof livro.autores === 'string') {
                try {
                    autoresArray = JSON.parse(livro.autores);
                } catch (e) {
                    // Se falhar, é um erro real, ou é a string "[object Object]"
                    console.warn(`JSON.parse falhou na linha ${livro.id}. Usando valor original.`);
                    autoresArray = [];
                }
            } else if (!autoresArray) {
                // Se for null/undefined (o que não deve ocorrer com JOIN, mas é boa prática)
                autoresArray = [];
            }


            return {
                ...livro,
                // Garantimos que 'autores' é um array de objetos, e não a string JSON
                autores: autoresArray 
            };
        });

        // Como o seu código anterior esperava a lista de autores no campo 'autorIds',
        // vamos transformar o resultado para corresponder à sua estrutura de retorno:
        const resultadoFinal = livrosComAutores.map(livro => ({
            id: livro.id,
            titulo: livro.titulo,
            anoPublicacao: livro.anoPublicacao,
            qtdDisponivel: livro.qtdDisponivel,
            // Pega apenas os IDs do array de objetos autores, conforme desejado
            autorIds: livro.autores.map(a => a.id) 
        }));


        res.status(200).json(resultadoFinal);
    } catch (error) {
        console.error('Erro ao buscar livros (N:N):', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// @GET /api/livros/:id
// @GET /api/livros/:id (CORRIGIDO PARA N:N)
exports.getLivroById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel,
                -- Agrega todos os autores relacionados a este livro no formato JSON
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', a.id, 
                        'nome', a.nome
                    )
                ) AS autores
            FROM livros l
            -- Usamos LEFT JOIN para garantir que o livro seja retornado mesmo que não tenha autores (embora a lógica do POST/PUT exija pelo menos 1)
            LEFT JOIN livro_autor la ON l.id = la.livro_id
            LEFT JOIN autores a ON la.autor_id = a.id
            WHERE l.id = ?
            GROUP BY l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel
        `;

        const [rows] = await pool.query(query, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Livro não encontrado.' });
        }
        
        const livro = rows[0];
        
        // --- MANIPULAÇÃO DO RETORNO JSON ---
        let autoresArray = livro.autores;

        // Tenta garantir que o campo JSON seja tratado corretamente pelo driver
        if (typeof livro.autores === 'string') {
            try {
                autoresArray = JSON.parse(livro.autores);
            } catch (e) {
                // Se o parse falhar (ex: se for NULL e JSON_ARRAYAGG retornar uma string 'null'), usamos um array vazio
                autoresArray = [];
            }
        }
        
        // Garante que o retorno corresponda ao campo 'autorIds' com um array de IDs
        const resultadoFinal = {
            id: livro.id,
            titulo: livro.titulo,
            anoPublicacao: livro.anoPublicacao,
            qtdDisponivel: livro.qtdDisponivel,
            // Retorna o array de IDs dos autores
            autorIds: autoresArray.map(a => a.id)
        };

        res.status(200).json(resultadoFinal);
        
    } catch (error) {
        console.error(`Erro ao buscar livro ID ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// @PUT /api/livros/:id
exports.updateLivro = async (req, res) => {
    const { id } = req.params;
    // autorIds é o array de IDs que vem do body
    const { titulo, anoPublicacao, qtdDisponivel, autorIds } = req.body; 

    // O PUT exige todos os campos
    if (!titulo || !anoPublicacao || qtdDisponivel === undefined || !autorIds || autorIds.length === 0) {
        return res.status(400).json({ 
            message: 'Todos os campos do livro e pelo menos um autorIds são obrigatórios para PUT.' 
        });
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

        // 1. Atualiza os dados principais do livro (CORRETO: Apenas dados do livro)
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
            SELECT 
                l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel,
                JSON_ARRAYAGG(
                    JSON_OBJECT('id', a.id, 'nome', a.nome)
                ) AS autores
            FROM livros l
            -- Usamos JOIN, pois acabamos de garantir que o livro tem autores na transação
            JOIN livro_autor la ON l.id = la.livro_id
            JOIN autores a ON la.autor_id = a.id
            WHERE l.id = ?
            GROUP BY l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Livro não encontrado após atualização.' });
        }

        // --- MANIPULAÇÃO DO RETORNO JSON (CORRIGIDO) ---
        const livroAtualizado = rows[0];
        let listaAutores = livroAtualizado.autores; 
        
        // CORREÇÃO: Remove JSON.parse, trata o valor se ainda for string (caso o driver não converta automaticamente)
        if (typeof listaAutores === 'string') {
            try {
                listaAutores = JSON.parse(livroAtualizado.autores);
            } catch (e) {
                // Se o parse falhar (ex: se for a string literal "[object Object]"), assume array vazio
                listaAutores = [];
            }
        } else if (!listaAutores) {
            listaAutores = [];
        }

        // Monta a resposta final
        res.status(200).json({
            id: livroAtualizado.id,
            titulo: livroAtualizado.titulo,
            anoPublicacao: livroAtualizado.anoPublicacao,
            qtdDisponivel: livroAtualizado.qtdDisponivel,
            // Retorna o array simples de IDs, conforme o padrão desejado
            autorIds: listaAutores.map(a => a.id) 
        });

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
    // autorIds é o array de IDs que vem do body, não o campo do DB.
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
        // CORREÇÃO: Removido 'autorIds' da lista de colunas e da lista de valores
        const [livroResult] = await connection.query(
            'INSERT INTO livros (titulo, anoPublicacao, qtdDisponivel) VALUES (?, ?, ?)',
            [titulo, anoPublicacao, qtdDisponivel]
        );
        const novoLivroId = livroResult.insertId;

        // 2. Monta o array de valores para a tabela `livro_autor` (TODOS OS AUTORES)
        const relacoes = autorIds.map(autorId => [novoLivroId, autorId]);

        // 3. Insere em lote na tabela PIVÔ
        await connection.query(
            'INSERT INTO livro_autor (livro_id, autor_id) VALUES ?',
            [relacoes]
        );

        // Confirma a transação
        await connection.commit();

        res.status(201).json({ 
            id: novoLivroId, 
            titulo, 
            anoPublicacao, 
            qtdDisponivel, 
            // Retorna o array de IDs no campo autorIds, conforme desejado
            autorIds: autorIds 
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
// @PATCH /api/livros/:id (CORRIGIDO)
exports.patchLivro = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    // autorIds é o array de IDs que vem do body (opcional)
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
        
        // --- INÍCIO DA TRANSAÇÃO ---
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
            SELECT 
                l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel,
                JSON_ARRAYAGG(
                    JSON_OBJECT('id', a.id, 'nome', a.nome)
                ) AS autores
            FROM livros l
            LEFT JOIN livro_autor la ON l.id = la.livro_id
            LEFT JOIN autores a ON la.autor_id = a.id
            WHERE l.id = ?
            GROUP BY l.id, l.titulo, l.anoPublicacao, l.qtdDisponivel
        `, [id]);
        
        if (rows.length === 0) {
             return res.status(404).json({ message: 'Livro não encontrado após atualização.' });
        }

        // --- MANIPULAÇÃO DO RETORNO JSON (CORRIGIDO) ---
        const livroAtualizado = rows[0];
        let listaAutores = livroAtualizado.autores; 
        
        // CORREÇÃO: Remove JSON.parse e trata o valor para array nativo
        if (typeof listaAutores === 'string') {
            try {
                listaAutores = JSON.parse(livroAtualizado.autores);
            } catch (e) {
                listaAutores = [];
            }
        } else if (!listaAutores) {
            listaAutores = [];
        }

        // Monta a resposta final
        res.status(200).json({
            id: livroAtualizado.id,
            titulo: livroAtualizado.titulo,
            anoPublicacao: livroAtualizado.anoPublicacao,
            qtdDisponivel: livroAtualizado.qtdDisponivel,
            // Retorna o array simples de IDs
            autorIds: listaAutores.map(a => a.id) 
        });


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