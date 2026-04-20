# 📚 Documentação: JWT, Postman Environment e Scripts

## 📖 Índice
1. [Sistema de Autenticação JWT](#sistema-de-autenticação-jwt)
2. [Rotas Protegidas (Autores e Livros)](#rotas-protegidas-autores-e-livros)
3. [Middleware de Autenticação](#middleware-de-autenticação)
4. [Postman Environment](#postman-environment)
5. [Script do Postman](#script-do-postman)
6. [Fluxo Completo](#fluxo-completo)

---

## 🔐 Sistema de Autenticação JWT

### O Que é JWT?

JWT (JSON Web Token) é um padrão aberto (RFC 7519) que permite transmitir informações de forma segura entre partes. Um JWT é composto por três partes separadas por pontos:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3VhcmlvIjoiYWRtaW4iLCJpYXQiOjE3MTMyODM2OTcsImV4cCI6MTcxMzM3MDA5N30.Y...
|_________________ 1 _________________|.|___________ 2 ___________|.|__________ 3 __________|
     Header (Algoritmo)          Payload (Dados)            Signature (Assinatura)
```

- **Header:** Define o tipo e algoritmo de criptografia (HS256)
- **Payload:** Contém os dados do usuário (nome, ID, etc)
- **Signature:** Garante que o token não foi modificado

---

## 🔒 Rotas Protegidas (Autores e Livros)

### Estrutura do Projeto

```
projeto/
├── middleware/
│   └── autenticacao.js      ← Valida o JWT
├── routes/
│   ├── autorRoutes.js       ← Rotas de autores (POST, PUT, PATCH, DELETE protegidas)
│   ├── livroRoutes.js       ← Rotas de livros (POST, PUT, PATCH, DELETE protegidas)
│   ├── membroRoutes.js
│   └── emprestimoRoutes.js
├── server.js                ← Inicia o servidor e rota de login
└── .env                     ← Variáveis de ambiente (JWT_SECRET, etc)
```

### Variáveis de Ambiente (.env)

```env
JWT_SECRET=sua_chave_secreta_super_segura_2024
JWT_EXPIRES_IN=24h
PORT=3000

MYSQL_ROOT_PASSWORD=root_password_123
MYSQL_DATABASE=banco
MYSQL_USER=user_admin_123
MYSQL_PASSWORD=user_admin_321
```

**Explicação:**
- `JWT_SECRET`: Chave usada para assinar e validar tokens (NUNCA compartilhe!)
- `JWT_EXPIRES_IN`: Tempo de validade do token (24 horas)
- `PORT`: Porta da API (3000)
- Restante: Configuração do banco de dados MySQL

---

## 🛡️ Middleware de Autenticação

### Arquivo: `middleware/autenticacao.js`

```javascript
const jwt = require('jsonwebtoken');

// Middleware de autenticação JWT
function autenticar(req, res, next) {
    // 1. Extrai o token do header Authorization
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

    // 2. Verifica se o token foi fornecido
    if (!token) {
        return res.status(401).json({ erro: 'Token não fornecido' });
    }

    // 3. Valida a assinatura e expiração do token
    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next(); // Token válido, continua para a próxima rota
    } catch (error) {
        res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
}

module.exports = { autenticar };
```

**O que faz?**
1. Procura pelo token no header `Authorization: Bearer <token>`
2. Se não encontrar, retorna erro 401
3. Se encontrar, valida a assinatura usando `JWT_SECRET`
4. Se for válido, salva os dados do usuário em `req.usuario` e continua
5. Se for inválido ou expirado, retorna erro 401

---

## 📍 Rotas Protegidas

### Autores - `routes/autorRoutes.js`

```javascript
const express = require('express');
const Autor = require('../models/Autor');
const { autenticar } = require('../middleware/autenticacao');
const router = express.Router();

// ✅ Público (sem token)
router.get('/autores', async (req, res) => {
    res.json(await Autor.findAll());
});

// ✅ Público (sem token)
router.get('/autores/:id', async (req, res) => {
    const autor = await Autor.findByPk(req.params.id);
    autor ? res.json(autor) : res.status(404).json({ erro: "Autor não encontrado" });
});

// 🔒 Protegido (precisa de token)
router.post('/autores', autenticar, async (req, res) => {
    try { 
        res.status(201).json(await Autor.create(req.body)); 
    } catch (e) { 
        res.status(400).json({ erro: e.message }); 
    }
});

// 🔒 Protegido (precisa de token)
router.put('/autores/:id', autenticar, async (req, res) => {
    try {
        const { nome, dataNascimento, nacionalidade } = req.body;
        const autor = await Autor.findByPk(req.params.id);
        if (!autor) return res.status(404).json({ erro: "Não encontrado" });
        await autor.update({ nome, dataNascimento, nacionalidade });
        res.json(autor);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

// 🔒 Protegido (precisa de token)
router.patch('/autores/:id', autenticar, async (req, res) => {
    try {
        const autor = await Autor.findByPk(req.params.id);
        if (!autor) return res.status(404).json({ erro: "Não encontrado" });
        await autor.update(req.body);
        res.json(autor);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

// 🔒 Protegido (precisa de token)
router.delete('/autores/:id', autenticar, async (req, res) => {
    try {
        const deletado = await Autor.destroy({ where: { id: req.params.id } });
        deletado ? res.status(204).send() : res.status(404).json({ erro: "Não encontrado" });
    } catch (e) { res.status(400).json({ erro: "Autor possui livros vinculados." }); }
});

module.exports = router;
```

**Resumo:**
- `GET` (listar/obter): Públicas ✅
- `POST` (criar): Protegida 🔒 → Precisa de `autenticar`
- `PUT` (atualizar completo): Protegida 🔒 → Precisa de `autenticar`
- `PATCH` (atualizar parcial): Protegida 🔒 → Precisa de `autenticar`
- `DELETE` (deletar): Protegida 🔒 → Precisa de `autenticar`

### Livros - `routes/livroRoutes.js`

Mesma estrutura de Autores, mas com validação de `autorIds`:

```javascript
const express = require('express');
const Livro = require('../models/Livro');
const Autor = require('../models/Autor');
const { autenticar } = require('../middleware/autenticacao');
const router = express.Router();

// ✅ Público
router.get('/livros', async (req, res) => {
    res.json(await Livro.findAll({ include: 'autores' }));
});

// ✅ Público
router.get('/livros/:id', async (req, res) => {
    const livro = await Livro.findByPk(req.params.id, { include: 'autores' });
    livro ? res.json(livro) : res.status(404).json({ erro: "Livro não encontrado" });
});

// 🔒 Protegido
router.post('/livros', autenticar, async (req, res) => {
    try {
        const { titulo, anoPublicacao, qtdDisponivel, autorIds } = req.body;
        
        // Valida se autorIds é um array preenchido
        if (!Array.isArray(autorIds) || autorIds.length === 0) {
            return res.status(400).json({ erro: "autorIds deve ser um array preenchido." });
        }

        // Busca os autores
        const autores = await Autor.findAll({ where: { id: autorIds } });
        
        // Valida se todos os IDs existem
        if (autores.length !== autorIds.length) {
            return res.status(404).json({ erro: "Um ou mais IDs de autores são inválidos." });
        }

        // Cria o livro e associa os autores
        const novoLivro = await Livro.create({ titulo, anoPublicacao, qtdDisponivel });
        await novoLivro.setAutores(autores);
        res.status(201).json(novoLivro);
    } catch (e) { res.status(400).json({ erro: e.message }); }
});

// 🔒 Protegido (PUT, PATCH, DELETE - mesma lógica)
```

---

## 🌐 Rota de Login - `server.js`

```javascript
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { autenticar } = require('./middleware/autenticacao');

const app = express();
app.use(express.json());

// 🔓 Rota PÚBLICA de Login
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;

    // Validação
    if (!usuario || !senha) {
        return res.status(400).json({ erro: 'Usuário e senha são obrigatórios' });
    }

    // Validação simples (em produção, verificar no banco de dados)
    if (usuario === 'admin' && senha === 'admin123') {
        // Cria o token JWT
        const token = jwt.sign(
            { usuario: usuario, iat: Math.floor(Date.now() / 1000) },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        res.json({ token });
    } else {
        res.status(401).json({ erro: 'Credenciais inválidas' });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor rodando em http://localhost:${process.env.PORT || 3000}`);
});
```

**O que faz:**
1. Recebe `usuario` e `senha` no body
2. Valida as credenciais (admin/admin123)
3. Se corretas, cria um JWT com:
   - Dados do usuário (`{ usuario: 'admin', iat: ... }`)
   - Assinado com `JWT_SECRET`
   - Válido por `JWT_EXPIRES_IN` (24h)
4. Retorna o token para o cliente

---

## 📮 Postman Environment

### O Que é Environment?

Um Environment no Postman é um conjunto de **variáveis** que você pode usar em suas requisições. Isso permite:
- Reutilizar URLs sem digitar toda vez
- Armazenar tokens
- Mudar entre desenvolvimento/produção facilmente

### Como Criar

1. Clique em **Environments** (lado esquerdo)
2. Clique em **"+"** para criar novo
3. **Name:** `Biblioteca`
4. Adicione as variáveis:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `url` | `http://localhost:3000` | `http://localhost:3000` |
| `token` | | (preenchido após login) |

5. Clique em **Save**

### Uso no Postman

**Antes (hardcoded):**
```
POST http://localhost:3000/autores
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Depois (com variáveis):**
```
POST {{url}}/autores
Authorization: Bearer {{token}}
```

Quando você seleciona o Environment `Biblioteca`, `{{url}}` vira `http://localhost:3000` e `{{token}}` vira o token salvo!

---

## 🔧 Script do Postman

### Arquivo: Post response Script na Requisição POST /login

```javascript
var jsonData = pm.response.json();
pm.environment.set("token", jsonData.token);
```

### Explicação Linha por Linha

| Linha | Explicação |
|-------|-----------|
| `var jsonData = pm.response.json();` | Pega a resposta JSON do servidor e armazena em `jsonData` |
| `pm.environment.set("token", jsonData.token);` | Salva o valor de `jsonData.token` no Environment na variável `token` |

### Fluxo Prático

```
1. Requisição POST /login é executada
   ↓
2. Servidor retorna: { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
   ↓
3. Script pega esse JSON
   ↓
4. Script extrai o campo "token"
   ↓
5. Script salva em Environment: token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ↓
6. Agora {{token}} em outras requisições retorna esse valor!
```

### ⚠️ IMPORTANTE: Onde Colocar o Script

**ERRADO ❌** - Na Collection (executa para TODAS as requisições):
```
Collection Biblioteca API
├── Post response Script (NÃO coloque aqui!)
├── POST Login
├── POST /autores
└── POST /livros
```

**CORRETO ✅** - Apenas na Requisição POST /login:
```
Collection Biblioteca API
├── POST Login
│   └── Post response Script ← COLOQUE AQUI!
├── POST /autores
└── POST /livros
```

Se colocar na Collection, o script executa em TODAS as requisições e limpa o token quando o JSON não tem um campo `token`!

---

## 🔄 Fluxo Completo

### Passo 1: Setup Inicial

```
1. Crie Environment "Biblioteca" com variáveis:
   - url = http://localhost:3000
   - token = (vazio)

2. Abra requisição POST /login:
   - URL: {{url}}/login
   - Body: { "usuario": "admin", "senha": "admin123" }
   - Vá em "Post response Script"
   - Cole: var jsonData = pm.response.json();
           pm.environment.set("token", jsonData.token);

3. Clique em Send
   → Token é salvo automaticamente em {{token}}
```

### Passo 2: Usar Token em Outras Requisições

```
POST {{url}}/autores
Headers:
  - Content-Type: application/json
  - Authorization: Bearer {{token}}

Body:
{
  "nome": "Machado de Assis",
  "dataNascimento": "1839-06-21",
  "nacionalidade": "Brasileiro"
}

Clique em Send
  → Postman substitui {{token}} pelo token real
  → Servidor valida o token
  → Requisição é processada ✅
```

### Passo 3: Token Permanece Válido

```
1. POST {{url}}/autores (usa {{token}}) ✅
2. PUT {{url}}/autores/1 (usa mesmo {{token}}) ✅
3. DELETE {{url}}/autores/1 (usa mesmo {{token}}) ✅
4. POST {{url}}/livros (usa mesmo {{token}}) ✅

Token continua válido por 24 horas!
```

### Passo 4: Quando o Token Expirar

```
Depois de 24 horas ou se receber erro "Token inválido":
1. Faça login NOVAMENTE (POST /login)
2. Novo token é gerado e salvo em {{token}}
3. Use o novo token nas próximas requisições
```

---

## 📊 Tabela Resumida

| Operação | Método | URL | Protegido | Headers |
|----------|--------|-----|-----------|---------|
| Login | POST | `/login` | ❌ Não | `Content-Type: application/json` |
| Listar Autores | GET | `/autores` | ❌ Não | — |
| Criar Autor | POST | `/autores` | ✅ Sim | `Authorization: Bearer {{token}}` |
| Atualizar Autor | PUT | `/autores/:id` | ✅ Sim | `Authorization: Bearer {{token}}` |
| Atualizar Parcial | PATCH | `/autores/:id` | ✅ Sim | `Authorization: Bearer {{token}}` |
| Deletar Autor | DELETE | `/autores/:id` | ✅ Sim | `Authorization: Bearer {{token}}` |
| Listar Livros | GET | `/livros` | ❌ Não | — |
| Criar Livro | POST | `/livros` | ✅ Sim | `Authorization: Bearer {{token}}` |
| Atualizar Livro | PUT | `/livros/:id` | ✅ Sim | `Authorization: Bearer {{token}}` |
| Atualizar Parcial | PATCH | `/livros/:id` | ✅ Sim | `Authorization: Bearer {{token}}` |
| Deletar Livro | DELETE | `/livros/:id` | ✅ Sim | `Authorization: Bearer {{token}}` |

---

## 🎯 Resumo Final

**JWT (Autenticação):**
- Token criado no login
- Válido por 24 horas
- Assinado com `JWT_SECRET`
- Protege rotas de modificação (POST, PUT, PATCH, DELETE)

**Middleware de Autenticação:**
- Valida o token em cada requisição protegida
- Extrai dados do usuário
- Retorna erro 401 se inválido

**Postman Environment:**
- Armazena `url` e `token`
- Evita digitar URLs e tokens repetidamente
- Permite reutilizar valores em múltiplas requisições

**Script do Postman:**
- Executa após receber resposta
- Salva o token automaticamente no Environment
- Deve estar APENAS na requisição de login

---

**Versão:** 1.0  
**Data:** April 2026
