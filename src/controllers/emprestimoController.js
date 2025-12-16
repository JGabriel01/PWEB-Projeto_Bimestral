const pool = require('../config/db'); 

// ------------------------------------
// UTILIDADE: Ajuste de Estoque (MySQL Transacional)
// ------------------------------------
async function ajustarDisponibilidadeLivro(connection, idLivro, delta) {
    const sqlUpdate = `
        UPDATE livros 
        SET qtdDisponivel = qtdDisponivel + ?
        WHERE id = ?
    `;
    const [resultado] = await connection.query(sqlUpdate, [delta, idLivro]);
    if (resultado.affectedRows === 0) {
        throw new Error(`Livro ID ${idLivro} não encontrado ou falha ao ajustar estoque.`);
    }
}

// ------------------------------------
// @GET /api/emprestimos - Listar todos
// ------------------------------------
exports.listarEmprestimos = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, livroId, membroId, dataEmprestimo, tempoMinDevolucao, tempoMaxDevolucao FROM emprestimos'); 
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao listar empréstimos:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// ------------------------------------
// @GET /api/emprestimos/:id - Buscar por ID
// ------------------------------------
exports.buscarEmprestimoPorId = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT id, livroId, membroId, dataEmprestimo, tempoMinDevolucao, tempoMaxDevolucao FROM emprestimos WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: `Empréstimo com ID ${id} não encontrado.` });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`Erro ao buscar empréstimo ID ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// ------------------------------------
// @POST /api/emprestimos - Novo Empréstimo (Transação: REGISTRAR E RETIRAR DO ESTOQUE)
// ------------------------------------
exports.createEmprestimo = async (req, res) => {
    const { livroId, membroId, dataEmprestimo, tempoMinDevolucao, tempoMaxDevolucao } = req.body; 
    let connection;

    if (!livroId || !membroId) {
        return res.status(400).json({ message: "livroId e membroId são obrigatórios." });
    }

    try {
        connection = await pool.getConnection(); 
        await connection.beginTransaction();

        // 1. VERIFICAR LIVRO (Verifica disponibilidade e trava para transação)
        const [livros] = await connection.query(
            'SELECT qtdDisponivel FROM livros WHERE id = ? FOR UPDATE', 
            [livroId]
        );

        if (livros.length === 0) {
             throw new Error(`Livro com ID ${livroId} não encontrado para associar ao empréstimo.`);
        }
        if (livros[0].qtdDisponivel <= 0) {
             throw new Error(`Livro com ID ${livroId} não tem unidades disponíveis.`);
        }

        // 2. VERIFICAR MEMBRO 
        const [membros] = await connection.query('SELECT id FROM membros WHERE id = ?', [membroId]);
        if (membros.length === 0) {
             throw new Error(`Membro com ID ${membroId} não encontrado para associar ao empréstimo.`);
        }
        
        // 3. INSERIR O REGISTRO DE EMPRÉSTIMO
        const sqlInsert = `
            INSERT INTO emprestimos (livroId, membroId, dataEmprestimo, tempoMinDevolucao, tempoMaxDevolucao)
            VALUES (?, ?, ?, ?, ?)
        `;
        const paramsInsert = [
            livroId, 
            membroId, 
            dataEmprestimo || null,
            tempoMinDevolucao !== undefined ? parseInt(tempoMinDevolucao) : null,
            tempoMaxDevolucao !== undefined ? parseInt(tempoMaxDevolucao) : null
        ]; 
        
        const [resultadoInsert] = await connection.query(sqlInsert, paramsInsert);
        const novoEmprestimoId = resultadoInsert.insertId;

        // 4. ATUALIZAR O ESTOQUE DO LIVRO (Decrementa -1)
        await ajustarDisponibilidadeLivro(connection, livroId, -1);
        
        // 5. COMMIT
        await connection.commit();

        res.status(201).json({ 
            id: novoEmprestimoId,
            livroId, 
            membroId,
            dataEmprestimo: dataEmprestimo || new Date().toISOString(),
            tempoMinDevolucao: tempoMinDevolucao !== undefined ? parseInt(tempoMinDevolucao) : null,
            tempoMaxDevolucao: tempoMaxDevolucao !== undefined ? parseInt(tempoMaxDevolucao) : null
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro na Transação de Novo Empréstimo:', error.message || error);
        
        const status = error.message && (
             error.message.includes('não encontrado') || error.message.includes('unidades disponíveis')
        ) ? 404 : 500;
        
        res.status(status).json({ message: error.message || 'Falha interna ao registrar empréstimo.' });

    } finally {
        if (connection) connection.release();
    }
};


// ------------------------------------
// @PUT /api/emprestimos/:id - Atualização Completa (Transação)
// ------------------------------------
exports.atualizarEmprestimo = async (req, res) => {
    const { id } = req.params;
    const { livroId, membroId, dataEmprestimo, tempoMinDevolucao, tempoMaxDevolucao } = req.body;
    let connection;

    if (livroId === undefined || membroId === undefined || dataEmprestimo === undefined || tempoMinDevolucao === undefined || tempoMaxDevolucao === undefined) {
        return res.status(400).json({ message: "Para o PUT, todos os campos do empréstimo (livroId, membroId, dataEmprestimo, tempoMinDevolucao, tempoMaxDevolucao) são obrigatórios." });
    }
    
    try {
        connection = await pool.getConnection(); 
        await connection.beginTransaction();
        
        // 1. Encontrar o empréstimo atual (e travar para atualização)
        const [emprestimos] = await connection.query(
            'SELECT livroId FROM emprestimos WHERE id = ? FOR UPDATE', [id]
        );
        
        if (emprestimos.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: `Empréstimo com ID ${id} não encontrado para atualização.` });
        }
        const livroAntigoId = emprestimos[0].livroId;
        const novoLivroId = parseInt(livroId);

        // 2. Lógica de estoque se o livroId MUDAR
        if (livroAntigoId !== novoLivroId) {
            // Devolve o livro antigo e verifica/retira o novo
            await ajustarDisponibilidadeLivro(connection, livroAntigoId, 1);
            const [livroNovo] = await connection.query('SELECT qtdDisponivel FROM livros WHERE id = ?', [novoLivroId]);
            
            if (livroNovo.length === 0 || livroNovo[0].qtdDisponivel <= 0) {
                throw new Error(`Livro com ID ${novoLivroId} não tem unidades disponíveis.`);
            }
            await ajustarDisponibilidadeLivro(connection, novoLivroId, -1);
        }

        // 3. ATUALIZAÇÃO do registro do empréstimo
        const sqlUpdate = `
            UPDATE emprestimos SET livroId = ?, membroId = ?, dataEmprestimo = ?, tempoMinDevolucao = ?, tempoMaxDevolucao = ? WHERE id = ?
        `;
        const paramsUpdate = [
            novoLivroId, 
            parseInt(membroId), 
            dataEmprestimo, 
            parseInt(tempoMinDevolucao), 
            parseInt(tempoMaxDevolucao), 
            id
        ];
        
        const [resultadoUpdate] = await connection.query(sqlUpdate, paramsUpdate);
        
        if (resultadoUpdate.affectedRows === 0) {
            throw new Error(`Falha ao atualizar o registro do empréstimo ID ${id}.`);
        }

        // 4. COMMIT
        await connection.commit();

        // 5. Retorna o registro atualizado 
        const [rows] = await pool.query('SELECT id, livroId, membroId, dataEmprestimo, tempoMinDevolucao, tempoMaxDevolucao FROM emprestimos WHERE id = ?', [id]);
        res.status(200).json(rows[0]);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Erro na Transação de Atualização PUT ID ${id}:`, error.message || error);
        
        const status = error.message && (
             error.message.includes('não encontrado') || error.message.includes('unidades disponíveis')
        ) ? 404 : 500;
        
        res.status(status).json({ message: error.message || 'Falha interna ao atualizar empréstimo.' });

    } finally {
        if (connection) connection.release();
    }
};

// ------------------------------------
// @PATCH /api/emprestimos/:id - Atualização Parcial (Transação)
// ------------------------------------
exports.atualizarParcialEmprestimo = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    let connection;

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Para o PATCH, pelo menos um campo do empréstimo deve ser fornecido!" });
    }

    try {
        connection = await pool.getConnection(); 
        await connection.beginTransaction();

        // 1. Encontrar o empréstimo atual (e travar para atualização)
        const [emprestimos] = await connection.query(
            'SELECT livroId FROM emprestimos WHERE id = ? FOR UPDATE', [id]
        );
        
        if (emprestimos.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: `Empréstimo com ID ${id} não encontrado para atualização parcial.` });
        }
        const livroAntigoId = emprestimos[0].livroId;
        
        const fields = [];
        const values = [];
        let novoLivroId = updates.livroId ? parseInt(updates.livroId) : livroAntigoId;
        
        // 2. Lógica de estoque se o livroId MUDAR
        if (updates.livroId !== undefined && livroAntigoId !== novoLivroId) {
            await ajustarDisponibilidadeLivro(connection, livroAntigoId, 1);
            const [livroNovo] = await connection.query('SELECT qtdDisponivel FROM livros WHERE id = ?', [novoLivroId]);
            
            if (livroNovo.length === 0 || livroNovo[0].qtdDisponivel <= 0) {
                throw new Error(`Livro com ID ${novoLivroId} não tem unidades disponíveis.`);
            }
            await ajustarDisponibilidadeLivro(connection, novoLivroId, -1);
            
            fields.push('livroId = ?');
            values.push(novoLivroId);

        } else if (updates.livroId !== undefined) {
             fields.push('livroId = ?');
             values.push(novoLivroId);
        }

        // 3. Outros campos (Incluindo os novos tempos)
        const camposPermitidos = ['membroId', 'dataEmprestimo', 'tempoMinDevolucao', 'tempoMaxDevolucao'];
        for (const key of camposPermitidos) {
            if (updates[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(key.startsWith('tempo') ? parseInt(updates[key]) : updates[key]);
            }
        }
        
        if (fields.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Nenhum campo válido fornecido para atualização parcial.' });
        }

        values.push(id); 
        
        // 4. ATUALIZAÇÃO do registro do empréstimo
        const query = `UPDATE emprestimos SET ${fields.join(', ')} WHERE id = ?`;
        const [resultadoUpdate] = await connection.query(query, values);
        
        if (resultadoUpdate.affectedRows === 0) {
            throw new Error(`Falha ao atualizar o registro do empréstimo ID ${id}.`);
        }

        // 5. COMMIT
        await connection.commit();

        // 6. Retorna o registro atualizado
        const [rows] = await pool.query('SELECT id, livroId, membroId, dataEmprestimo, tempoMinDevolucao, tempoMaxDevolucao FROM emprestimos WHERE id = ?', [id]);
        res.status(200).json(rows[0]);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Erro na Transação de Atualização PATCH ID ${id}:`, error.message || error);
        
        const status = error.message && (
             error.message.includes('não encontrado') || error.message.includes('unidades disponíveis')
        ) ? 404 : 500;
        
        res.status(status).json({ message: error.message || 'Falha interna ao atualizar parcialmente empréstimo.' });

    } finally {
        if (connection) connection.release();
    }
};

// ------------------------------------
// @DELETE /api/emprestimos/:id - Devolução (Transação: REMOVER REGISTRO E DEVOLVER AO ESTOQUE)
// ------------------------------------
exports.deletarEmprestimo = async (req, res) => {
    const { id } = req.params; 
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. BUSCAR idLivro do empréstimo (e travar para atualização)
        const [emprestimos] = await connection.query(
            'SELECT livroId FROM emprestimos WHERE id = ? FOR UPDATE', [id]
        );
        
        if (emprestimos.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: `Empréstimo com ID ${id} não encontrado para remoção.` });
        }
        const livroId = emprestimos[0].livroId;


        // 2. DELETAR O REGISTRO DE EMPRÉSTIMO
        const [resultadoDelete] = await connection.query(
            'DELETE FROM emprestimos WHERE id = ?', [id]
        );
        
        if (resultadoDelete.affectedRows === 0) {
             throw new Error('Falha ao deletar o registro de empréstimo.');
        }

        // 3. ATUALIZAR O ESTOQUE DO LIVRO (Incrementa +1)
        await ajustarDisponibilidadeLivro(connection, livroId, 1);
        
        // 4. COMMIT
        await connection.commit();

        res.status(200).json({ message: "Empréstimo removido (devolvido) com sucesso." });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro na Transação de Devolução/Remoção:', error.message || error);
        
        res.status(500).json({ message: error.message || 'Falha interna ao remover empréstimo.' });

    } finally {
        if (connection) connection.release();
    }
};