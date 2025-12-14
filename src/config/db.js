const mysql = require('mysql2/promise');

// O .env já foi carregado no server.js
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    // A porta 3307 é a que você mapeou no docker-compose.yaml
    port: 3307,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testar a conexão
pool.getConnection()
    .then(connection => {
        console.log('✅ Conexão com o banco de dados MySQL estabelecida com sucesso!');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Erro ao conectar com o banco de dados MySQL:', err.message);
        // Em um ambiente de produção, você pode querer sair do processo
        // process.exit(1);
    });

module.exports = pool;