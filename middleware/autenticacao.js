const jwt = require('jsonwebtoken');

// Middleware de autenticação JWT
function autenticar(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ erro: 'Token não fornecido' });
    }

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
}

// Middleware de autorização para admin
function autenticarAdmin(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ erro: 'Token não fornecido' });
    }

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        
        if (req.usuario.role !== 'admin') {
            return res.status(403).json({ erro: 'Acesso negado: requer permissões de admin' });
        }
        
        next();
    } catch (error) {
        res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
}

module.exports = { autenticar, autenticarAdmin };
