const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('banco', 'user_admin_123', 'user_admin_321', {
  host: 'localhost',
  dialect: 'mysql',
  logging: true,
  port: 3307,
});

module.exports = sequelize;
