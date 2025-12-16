const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Livro = sequelize.define('Livro', {
  titulo: { type: DataTypes.STRING, allowNull: false }, // "Título" na imagem
  anoPublicacao: { type: DataTypes.INTEGER }, // "Ano_Publicacao"
  qtdDisponivel: { type: DataTypes.INTEGER, defaultValue: 0 } // "Qtd_disponivel"
}, { freezeTableName: true });

module.exports = Livro;