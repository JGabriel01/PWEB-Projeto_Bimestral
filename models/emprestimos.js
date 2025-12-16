const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Emprestimo = sequelize.define('Emprestimo', {
  dataEmprestimo: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  tempoMinDevolucao: { type: DataTypes.INTEGER },
  tempoMaxDevolucao: { type: DataTypes.INTEGER }
});

module.exports = Emprestimo;