const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Livro = sequelize.define('Livro', {
  titulo: { type: DataTypes.STRING, allowNull: false },
  anoPublicacao: { type: DataTypes.INTEGER },
  qtdDisponivel: { type: DataTypes.INTEGER, defaultValue: 0 }
});

module.exports = Livro;