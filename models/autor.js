const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Autor = sequelize.define('Autor', {
  nome: { type: DataTypes.STRING, allowNull: false },
  dataNascimento: { type: DataTypes.DATEONLY }, // "Data_Nascimento" na imagem
  nacionalidade: { type: DataTypes.STRING }
}, { freezeTableName: true });

module.exports = Autor;