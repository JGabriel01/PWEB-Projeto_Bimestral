const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Autor = sequelize.define('Autor', {
  nome: { type: DataTypes.STRING, allowNull: false },
  dataNascimento: { type: DataTypes.DATEONLY },
  nacionalidade: { type: DataTypes.STRING }
});

module.exports = Autor;