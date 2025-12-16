const express = require('express');
const sequelize = require('./database/db');

// Importar Modelos para Associações
const Autor = require('./models/autor');
const Livro = require('./models/livros');
const Membro = require('./models/membros');
const Emprestimo = require('./models/emprestimos');

// Importar Rotas
const autorRoutes = require('./routes/autorRoutes');
const livroRoutes = require('./routes/livroRoutes');
const membroRoutes = require('./routes/membroRoutes');
const emprestimoRoutes = require('./routes/emprestimoRoutes');

const app = express();
app.use(express.json());

// CONFIGURAR RELACIONAMENTOS
Autor.belongsToMany(Livro, { through: 'LivroAutores' });
Livro.belongsToMany(Autor, { through: 'LivroAutores' });
Livro.hasMany(Emprestimo, { foreignKey: 'livroId' });
Emprestimo.belongsTo(Livro, { foreignKey: 'livroId' });
Membro.hasMany(Emprestimo, { foreignKey: 'membroId' });
Emprestimo.belongsTo(Membro, { foreignKey: 'membroId' });

// USAR ROTAS
app.use(autorRoutes);
app.use(livroRoutes);
app.use(membroRoutes);
app.use(emprestimoRoutes);

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    app.listen(3000, () => console.log("Servidor rodando em http://localhost:3000"));
  } catch (error) {
    console.error("Erro ao iniciar:", error);
  }
})();