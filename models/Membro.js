const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');
const bcrypt = require('bcrypt');

const Membro = sequelize.define('Membro', {
  nome: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  senha: { type: DataTypes.STRING, allowNull: false },
  endereco: { type: DataTypes.STRING }
}, { 
  freezeTableName: true,
  hooks: {
    beforeCreate: async (m) => { m.senha = await bcrypt.hash(m.senha, 10); },
    beforeUpdate: async (m) => { if (m.changed('senha')) m.senha = await bcrypt.hash(m.senha, 10); }
  }
});

module.exports = Membro;