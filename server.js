const express = require('express');
const sequelize = require('./database/db');

// --- IMPORTAÇÃO DOS MODELOS ---
const Autor = require('./models/Autor');
const Livro = require('./models/Livro');
const Membro = require('./models/Membro');
const Emprestimo = require('./models/Emprestimo');

// --- IMPORTAÇÃO DAS ROTAS ---
const autorRoutes = require('./routes/autorRoutes');
const livroRoutes = require('./routes/livroRoutes');
const membroRoutes = require('./routes/membroRoutes');
const emprestimoRoutes = require('./routes/emprestimoRoutes');

const app = express();

// Middleware para JSON
app.use(express.json());

// --- CONFIGURAÇÃO DOS RELACIONAMENTOS (MODELO ER) ---

/**
 * Relacionamento N:M (Muitos-para-Muitos) entre Livro e Autor
 * O alias 'autores' define o nome da função .setAutores() usada nas rotas.
 */
Livro.belongsToMany(Autor, { 
    through: 'LivroAutores', 
    as: 'autores', 
    foreignKey: 'livroId' 
});
Autor.belongsToMany(Livro, { 
    through: 'LivroAutores', 
    as: 'livros', 
    foreignKey: 'autorId' 
});

/**
 * Relacionamento 1:N (Um-para-Muitos) entre Livro e Empréstimo
 * Um livro pode estar em vários empréstimos.
 */
Livro.hasMany(Emprestimo, { 
    foreignKey: 'livroId', 
    onDelete: 'RESTRICT' 
});
Emprestimo.belongsTo(Livro, { 
    foreignKey: 'livroId' 
});

/**
 * Relacionamento 1:N (Um-para-Muitos) entre Membro e Empréstimo
 * Um membro pode realizar vários empréstimos.
 */
Membro.hasMany(Emprestimo, { 
    foreignKey: 'membroId', 
    onDelete: 'RESTRICT' 
});
Emprestimo.belongsTo(Membro, { 
    foreignKey: 'membroId' 
});

// --- REGISTRO DAS ROTAS ---
app.use(autorRoutes);
app.use(livroRoutes);
app.use(membroRoutes);
app.use(emprestimoRoutes);

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = 3000;

(async () => {
    try {
        // Verifica conexão com o banco
        await sequelize.authenticate();
        console.log('Conexão com o banco de dados estabelecida com sucesso.');

        /**
         * Sincroniza os modelos com o banco de dados.
         * alter: true atualiza as tabelas existentes sem apagar os dados, 
         * ideal para ajustar chaves estrangeiras e a tabela LivroAutores.
         */
        await sequelize.sync({ alter: true });
        console.log('Modelos sincronizados com o banco de dados.');

        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Não foi possível conectar ao banco de dados:', error);
    }
})();