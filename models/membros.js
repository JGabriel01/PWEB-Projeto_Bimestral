const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');
const bcrypt = require('bcrypt');

const Membro = sequelize.define('Membro', {
  nome: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  senha: { type: DataTypes.STRING, allowNull: false },
  endereco: { type: DataTypes.STRING }
}, {
  hooks: {
    beforeCreate: async (membro) => {
      const salt = await bcrypt.genSalt(10);
      membro.senha = await bcrypt.hash(membro.senha, salt);
    },
    beforeUpdate: async (membro) => {
      if (membro.changed('senha')) {
        const salt = await bcrypt.genSalt(10);
        membro.senha = await bcrypt.hash(membro.senha, salt);
      }
    }
  }
});

Membro.prototype.validarSenha = async function (senha) {
  return bcrypt.compare(senha, this.senha);
};

module.exports = Membro;