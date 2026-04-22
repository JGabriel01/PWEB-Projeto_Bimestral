# 📚 GUIA COMPLETO - Autenticação JWT no Projeto Biblioteca

## Índice
1. [O que é JWT?](#jwt)
2. [Arquitetura do Projeto](#arquitetura)
3. [Fluxo de Autenticação](#fluxo)
4. [Explicação do Código](#código)
5. [Como Testar no Postman](#postman)
6. [Pontos-Chave para Apresentar](#apresentação)

---

## <a name="jwt"></a> 1️⃣ O que é JWT? (JSON Web Token)

### Definição
JWT é um padrão aberto (RFC 7519) que permite transmitir informações de forma **segura** e **verificável** entre duas partes.

### Estrutura do JWT
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJpZCI6MSwibm9tZSI6Ikpvw6NvIn0.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Header (1)          | Payload (2)           | Signature (3)
```

**1. Header:** Algoritmo de criptografia
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**2. Payload:** Dados do usuário
```json
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@biblioteca.com",
  "iat": 1719325200,
  "exp": 1719411600
}
```

**3. Signature:** Assinatura criptografada (garante autenticidade)
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secretKey
)
```

### Por que usar JWT?
✅ **Seguro:** Impossível modificar dados sem invalidar a assinatura  
✅ **Stateless:** Não precisa armazenar sessão no servidor  
✅ **Portável:** Pode ser usado em APIs mobile, web, etc  
✅ **Padrão:** RFC 7519, usado em todo o mercado  

---

## <a name="arquitetura"></a> 2️⃣ Arquitetura do Projeto

```
PWEB-Projeto_Bimestral/
│
├── server.js                              ← Servidor principal + POST /login
├── middleware/
│   └── autenticacao.js                    ← Valida token JWT
│
├── models/
│   ├── Membro.js                          ← Bcrypt automático na senha
│   ├── Autor.js
│   ├── Livro.js
│   └── Emprestimo.js
│
├── routes/
│   ├── autorRoutes.js                     ← POST/PUT/PATCH/DELETE protegidas
│   ├── livroRoutes.js                     ← POST/PUT/PATCH/DELETE protegidas
│   ├── membroRoutes.js                    ← POST (PÚBLICO), PUT/PATCH/DELETE protegidas
│   ├── emprestimoRoutes.js                ← POST/PUT/PATCH/DELETE protegidas
│   └── perfilRoutes.js                    ← GET /perfil (protegida) ← NOVA!
│
├── database/
│   └── db.js                              ← Conexão com MySQL
│
└── .env                                   ← Configurações sensíveis
```

---

## <a name="fluxo"></a> 3️⃣ Fluxo de Autenticação (Passo a Passo)

### 📊 Diagrama do Fluxo

```
┌─────────────┐
│   Cliente   │ (Postman, App, Web)
└──────┬──────┘
       │
       │ 1. POST /login (email + senha)
       ├─────────────────────────────────────────────┐
       │                                             │
       │                                   ┌─────────▼─────────┐
       │                                   │   Servidor (Node) │
       │                                   └─────────┬─────────┘
       │                                             │
       │                         2. Buscar membro por email
       │                            SELECT * FROM Membro WHERE email = ?
       │                                             │
       │                         3. Validar senha com bcrypt.compare()
       │                            Senha enviada vs Hash no BD
       │                                             │
       │                         4. Se válido, gerar JWT token
       │                            jwt.sign({ id, nome, email })
       │                                             │
       │ 5. Retorna token + dados do membro ◀────────┘
       │ (Armazena token no cliente)
       │
       │ 6. GET /perfil
       │    Header: Authorization: Bearer <token>
       │                             │
       │                              ├─────────────────────────────────┐
       │                              │ Middleware: autenticar (valida) │
       │                              │ - Extrai token do header        │
       │                              │ - Verifica assinatura           │
       │                              │ - Extrai dados (id, nome, email)│
       │                              └──────────────┬──────────────────┘
       │                                             │
       │                              7. Handler /perfil executa
       │                                 Busca Membro.findByPk(req.usuario.id)
       │                                 Retorna dados do perfil
       │                                             │
       ◀─────────────────────8. Dados do Perfil──────┘
```

### 🔄 Sequência Detalhada

**PASSO 1: Login**
```
POST /login
Body: { "email": "joao@biblioteca.com", "senha": "minhasenha123" }

Servidor:
1. Busca no banco: SELECT * FROM Membros WHERE email = 'joao@biblioteca.com'
   Retorna: { id: 1, nome: "João Silva", email: "...", senha: "$2b$10$..." }

2. Compara senhas:
   bcrypt.compare("minhasenha123", "$2b$10$...")
   → true (senhas batem!)

3. Gera token:
   jwt.sign({ id: 1, nome: "João Silva", email: "joao@biblioteca.com" }, SECRET)
   → "eyJhbGciOiJIUzI1NiIs..."

Response (200 OK):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "membro": { "id": 1, "nome": "João Silva", "email": "joao@biblioteca.com" }
}
```

**PASSO 2: Acessar Rota Protegida**
```
GET /perfil
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Middleware autenticar executa:
1. Extrai token: req.headers['authorization'].split(' ')[1]
   → "eyJhbGciOiJIUzI1NiIs..."

2. Valida token: jwt.verify(token, SECRET)
   → { id: 1, nome: "João Silva", email: "joao@biblioteca.com" }

3. Salva em req.usuario:
   req.usuario = { id: 1, nome: "João Silva", email: "joao@biblioteca.com" }

4. Chama next() → passa para o handler

Handler /perfil executa:
const membro = await Membro.findByPk(req.usuario.id)
→ SELECT * FROM Membros WHERE id = 1

Response (200 OK):
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@biblioteca.com",
  "endereco": "Rua A, 100"
}
```

---

## <a name="código"></a> 4️⃣ Explicação do Código

### 🔐 A. POST /login (server.js)

```javascript
app.post('/login', async (req, res) => {
    try {
        // 1. Recebe email e senha do body
        const { email, senha } = req.body;

        // 2. Valida se foram fornecidos
        if (!email || !senha) {
            return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
        }

        // 3. BUSCA O MEMBRO NO BANCO (ponto-chave!)
        const membro = await Membro.findOne({ where: { email } });

        if (!membro) {
            // Email não existe no banco
            return res.status(401).json({ erro: 'Credenciais inválidas' });
        }

        // 4. VALIDA A SENHA COM BCRYPT (segurança!)
        const senhaValida = await bcrypt.compare(senha, membro.senha);
        // bcrypt.compare compara a senha texto plano com o hash no BD
        // Impossível recuperar a senha original!

        if (!senhaValida) {
            // Senha errada
            return res.status(401).json({ erro: 'Credenciais inválidas' });
        }

        // 5. GERA TOKEN JWT (com dados reais do membro!)
        const token = jwt.sign(
            { 
                id: membro.id,           // ← ID real do banco
                nome: membro.nome,       // ← Nome real do banco
                email: membro.email,     // ← Email real do banco
                iat: Math.floor(Date.now() / 1000)  // Issued at
            },
            process.env.JWT_SECRET,      // Chave secreta (no .env!)
            { expiresIn: process.env.JWT_EXPIRES_IN }  // 24h
        );

        // 6. RETORNA TOKEN + DADOS
        res.json({ 
            token,
            membro: {
                id: membro.id,
                nome: membro.nome,
                email: membro.email
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});
```

**Pontos importantes:**
- ✅ Busca email no banco (autenticação real, não mockada)
- ✅ Usa bcrypt.compare() para validar senha
- ✅ Token contém dados reais do membro (id, nome, email)
- ✅ Token é assinado com JWT_SECRET
- ✅ Token expira em 24h

---

### 🛡️ B. Middleware de Autenticação (middleware/autenticacao.js)

```javascript
function autenticar(req, res, next) {
    // 1. Extrai o token do header Authorization
    const token = req.headers['authorization']?.split(' ')[1];
    // Header exemplo: "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
    // .split(' ')[1] pega apenas o token, descartando "Bearer"

    // 2. Se não houver token, nega acesso
    if (!token) {
        return res.status(401).json({ erro: 'Token não fornecido' });
    }

    // 3. VALIDA O TOKEN (ponto-chave!)
    try {
        // jwt.verify verifica:
        // - Se a assinatura é válida (não foi modificado)
        // - Se o token não expirou
        // - Retorna os dados dentro do token
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        
        // req.usuario agora contém: { id, nome, email, iat, exp }
        
        // 4. Token válido, passa para o próximo handler
        next();
    } catch (error) {
        // Token inválido ou expirado
        res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
}

module.exports = { autenticar };
```

**Como é usado:**
```javascript
// Rota PROTEGIDA (precisa de token)
router.post('/autores', autenticar, async (req, res) => {
    // autenticar valida o token antes de chegar aqui
    // Se falhar, retorna 401 e nunca chega ao handler
    
    // Se passar, req.usuario está disponível:
    const membroId = req.usuario.id;  // ← Extraído do token!
});

// Rota PÚBLICA (não precisa de token)
router.get('/autores', async (req, res) => {
    // Nenhum middleware, qualquer um pode acessar
});
```

---

### 👤 C. GET /perfil (routes/perfilRoutes.js)

```javascript
router.get('/perfil', autenticar, async (req, res) => {
    try {
        // req.usuario foi preenchido pelo middleware autenticar
        // Contém: { id, nome, email, iat, exp }
        
        // Busca dados completos do membro no banco
        const membro = await Membro.findByPk(req.usuario.id);

        if (!membro) {
            return res.status(404).json({ erro: 'Membro não encontrado' });
        }

        // Retorna dados do perfil
        res.json({
            id: membro.id,
            nome: membro.nome,
            email: membro.email,
            endereco: membro.endereco
        });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});
```

**Propósito:**
- Demonstra que o token funciona de verdade
- Mostra que req.usuario.id pode ser usado para buscar dados
- Prova que apenas usuários autenticados acessam
- Alinhado com o exemplo do professor

---

### 🔐 D. Modelo Membro com Bcrypt (models/Membro.js)

```javascript
const Membro = sequelize.define('Membro', {
  nome: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  senha: { type: DataTypes.STRING, allowNull: false },
  endereco: { type: DataTypes.STRING }
}, { 
  freezeTableName: true,
  hooks: {
    // HOOK: Executa ANTES de criar (CREATE)
    beforeCreate: async (m) => { 
      m.senha = await bcrypt.hash(m.senha, 10);  // Hash automático!
    },
    // HOOK: Executa ANTES de atualizar (UPDATE)
    beforeUpdate: async (m) => { 
      if (m.changed('senha'))  // Se senha foi alterada
        m.senha = await bcrypt.hash(m.senha, 10);
    }
  }
});
```

**Importante:**
- ✅ Bcrypt é automático (hooks)
- ✅ Senha nunca é armazenada em texto plano
- ✅ Salt de 10 rounds (segurança forte)
- ✅ Impossível recuperar senha original
- ✅ Email é único (evita duplicatas)

---

## <a name="postman"></a> 5️⃣ Como Testar no Postman

### 📋 Setup Inicial

1. **Iniciar servidor**
```bash
npm install
npm start
```

2. **Criar Environment no Postman**
   - Name: `Biblioteca`
   - Variável: `url = http://localhost:3000`
   - Variável: `token = (deixe vazio)`

3. **Selecionar Environment**
   - Canto superior direito: `Biblioteca`

---

### 🧪 Teste 0: Criar Admin (PRIMEIRA VEZ - SEM TOKEN - PÚBLICO!)

```
Método: POST
URL: {{url}}/criar-admin
Headers: Content-Type: application/json
Body (raw, JSON):
{
  "nome": "Admin Biblioteca",
  "email": "admin@biblioteca.com",
  "senha": "senha_admin_segura_123"
}

Response (201 Created):
{
  "mensagem": "Admin criado com sucesso",
  "membro": {
    "id": 1,
    "nome": "Admin Biblioteca",
    "email": "admin@biblioteca.com",
    "role": "admin"
  }
}

⭐ IMPORTANTE: Faça isso UMA ÚNICA VEZ!
⭐ Este é o usuário que pode criar livros, autores e empréstimos.
Nota: `role: "admin"` é a informação importante
```

---

### 🧪 Teste 1: Criar Membro (SEM TOKEN - PÚBLICO!)

```
Método: POST
URL: {{url}}/membros
Headers: Content-Type: application/json
Body (raw, JSON):
{
  "nome": "João Silva",
  "email": "joao@biblioteca.com",
  "senha": "minhasenha123",
  "endereco": "Rua A, 100"
}

Response (201 Created):
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@biblioteca.com",
  "endereco": "Rua A, 100"
}

⭐ IMPORTANTE: POST /membros é PÚBLICO - qualquer um pode se registrar!
Nota: Senha não aparece (foi hasheada e nunca é retornada)
```

---

### 🧪 Teste 2: Login

```
Método: POST
URL: {{url}}/login
Headers: Content-Type: application/json
Body (raw, JSON):
{
  "email": "joao@biblioteca.com",
  "senha": "minhasenha123"
}

Response (200 OK):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "membro": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@biblioteca.com"
  }
}

⭐ IMPORTANTE: Copie o token da resposta!
```

---

### 🧪 Teste 3: Acessar Perfil (Rota Protegida)

```
Método: GET
URL: {{url}}/perfil
Headers: 
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body: (vazio)

Response (200 OK):
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@biblioteca.com",
  "endereco": "Rua A, 100"
}

✅ Token funcionando! Rota protegida acessada com sucesso!
```

---

### 🧪 Teste 4: Criar Autor (Rota Protegida)

```
Método: POST
URL: {{url}}/autores
Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body (raw, JSON):
{
  "nome": "Machado de Assis",
  "dataNascimento": "1839-06-21",
  "nacionalidade": "Brasileiro"
}

Response (201 Created):
{
  "id": 1,
  "nome": "Machado de Assis",
  "dataNascimento": "1839-06-21",
  "nacionalidade": "Brasileiro"
}

✅ Outro recurso criado com token!
```

---

### ❌ Teste 5: Erro - Sem Token

```
Método: GET
URL: {{url}}/perfil
Headers: Content-Type: application/json
Body: (vazio)

Response (401 Unauthorized):
{
  "erro": "Token não fornecido"
}

⚠️ Erro esperado! Rota protegida bloqueou acesso sem token.
```

---

### ❌ Teste 5b: Erro - User Comum Tentando Criar Livro (SEM PERMISSÃO ADMIN)

```
Método: POST
URL: {{url}}/livros
Headers:
  Content-Type: application/json
  Authorization: Bearer <token_do_usuario_comum>
Body (raw, JSON):
{
  "titulo": "Dom Casmurro",
  "anoPublicacao": 1899,
  "qtdDisponivel": 5,
  "autorIds": [1]
}

Response (403 Forbidden):
{
  "erro": "Acesso negado: requer permissões de admin"
}

🔐 IMPORTANTE: Somente admins podem criar/editar livros!
User comum NÃO consegue mesmo com token válido!
```

---

### ❌ Teste 6: Erro - Senha Errada

```
Método: POST
URL: {{url}}/login
Headers: Content-Type: application/json
Body (raw, JSON):
{
  "email": "joao@biblioteca.com",
  "senha": "SENHA_ERRADA"
}

Response (401 Unauthorized):
{
  "erro": "Credenciais inválidas"
}

⚠️ Erro esperado! Bcrypt rejeitou a senha errada.
```

---

## <a name="apresentação"></a> 6️⃣ Pontos-Chave para Apresentar

### 🎯 Abertura (30 segundos)
```
"Neste projeto, implementamos autenticação JWT de verdade, não mockada.
O sistema funciona com:
1. Login real com email/senha do banco de dados
2. Bcrypt para validar senhas com segurança
3. Token JWT assinado e verificado
4. Rotas protegidas que exigem autenticação"
```

---

### 📊 Demonstração Visual (2 minutos)

**Mostrar no Postman:**

1. **Criar membro** (POST /membros - SEM TOKEN!)
   - "Primeiro, qualquer um pode criar uma conta (sem precisar de token)"
   - Mostrar criar membro com nome, email, senha

2. **Fazer login** (POST /login - SEM TOKEN!)
   - "Com o email e senha, o servidor gera um token JWT"
   - Mostrar resposta com token + dados

3. **Acessar rota protegida** (GET /perfil - COM TOKEN!)
   - "Usando o token, conseguimos acessar rotas protegidas"
   - Mostrar que retorna os dados do perfil

4. **Tentar sem token**
   - "Sem token, o servidor retorna erro 401"

---

### 🔐 Explicar Segurança (2 minutos)

**"Por que o JWT é seguro?"**

1. **Bcrypt no Login**
   - "A senha é hasheada com bcrypt antes de armazenar"
   - "Bcrypt.compare valida a senha sem recuperá-la"
   - "Impossível saber a senha original"

2. **Assinatura JWT**
   - "O token é assinado com uma chave secreta (JWT_SECRET)"
   - "Se alguém modificar o token, a assinatura invalida"
   - "Servidor sempre valida a assinatura"

3. **Validação em Cada Requisição**
   - "O middleware autenticar valida o token"
   - "Se token expirou (24h), é rejeitado"
   - "Se token for falso, é rejeitado"

---

### 📚 Arquitetura (1 minuto)

**"Componentes principais:"**

| Componente | Responsabilidade |
|-----------|-----------------|
| **POST /login** | Autentica e gera token |
| **Middleware autenticar** | Valida token em rotas protegidas |
| **GET /perfil** | Rota protegida de exemplo |
| **Bcrypt (Membro.js)** | Hash automático de senhas |
| **JWT_SECRET (.env)** | Chave para assinar token |

---

### 🔄 Fluxo Resumido (1 minuto)

```
0. ⭐ REGISTRO (SEM TOKEN)
   Usuario: POST /membros (nome, email, senha, endereco)
   ↓
1. LOGIN (SEM TOKEN)
   Usuario: POST /login (email, senha)
   ↓
2. Servidor: Busca email no banco, valida senha com bcrypt
   ↓
3. Servidor: Gera JWT com dados do usuario (id, nome, email)
   ↓
4. Usuario: Armazena token
   ↓
5. ACESSO PROTEGIDO (COM TOKEN!)
   Usuario: GET /perfil com Authorization: Bearer <token>
   ↓
6. Middleware: Valida token
   ↓
7. Servidor: Retorna dados do perfil (req.usuario.id)
```

---

### ✅ Checklist: "Cumpre Requisitos?"

**Requisito 1: "Realizar chamada para fazer login"**
- ✅ POST /login existe
- ✅ Autentica por email/senha
- ✅ Retorna token JWT
- ✅ **Cumpre!**

**Requisito 2: "Posteriormente, realizar chamadas para rotas autenticadas"**
- ✅ GET /perfil protegida (nova)
- ✅ POST/PUT/PATCH/DELETE /autores protegidas (existentes)
- ✅ POST/PUT/PATCH/DELETE /livros protegidas (existentes)
- ✅ PUT/PATCH/DELETE /membros protegidas (POST é público para registro!)
- ✅ POST/PUT/PATCH/DELETE /emprestimos protegidas (existentes)
- ✅ **Cumpre bem!**

**Requisito 3: "Ser capaz de explicar o uso na prática"**
- ✅ Código documentado
- ✅ Exemplos funcionam no Postman
- ✅ Fluxo claro (criar → login → acessar)
- ✅ **Cumpre!**

**Alinhamento com Exemplo do Professor:**
- ✅ Login com banco de dados (não mockado)
- ✅ Bcrypt para senhas (segurança real)
- ✅ Token com dados do usuário (id, nome, email, role)
- ✅ Rota protegida /perfil funcional
- ✅ **100% Alinhado!**

**Bonus - Sistema de Roles (Admin vs User):**
- ✅ Campo `role` adicionado à tabela Membro (ENUM: 'user', 'admin')
- ✅ Default role é 'user' (segurança por padrão)
- ✅ Role incluído no token JWT
- ✅ Middleware `autenticarAdmin()` valida role='admin'
- ✅ Rotas sensíveis protegidas: POST/PUT/PATCH/DELETE livros, autores, empréstimos
- ✅ Endpoint `/criar-admin` para criar primeiro admin
- ✅ Erro 403 quando user comum tenta acessar rota admin
- ✅ **Segurança em camadas!**

---

### 💡 Respostas a Possíveis Perguntas do Professor

**P: "Por que usar bcrypt?"**
```
A: "Bcrypt é um algoritmo de hash com salt. Diferente de SHA ou MD5,
   é especificamente desenhado para senhas. É lento propositalmente,
   tornando ataques de força bruta impraticáveis. A senha original
   nunca pode ser recuperada do hash."
```

**P: "E se alguém modificar o token?"**
```
A: "Se modificar um byte do token, a assinatura fica inválida.
   O servidor usa jwt.verify() que valida a assinatura.
   Se não bater com JWT_SECRET, retorna erro 401."
```

**P: "Qual é a diferença entre seu projeto e o mockado?"**
```
A: "Antes: hardcoded usuario === 'admin' && senha === 'admin123'
   Agora: Busca email no banco, valida com bcrypt, token tem dados reais
   Antes: Token tinha apenas { usuario: 'admin' }
   Agora: Token tem { id, nome, email } - dados reais do banco
   Resultado: Autenticação de verdade, não é apenas demonstração."
```

**P: "Por que precisa de token se tem Membro no banco?"**
```
A: "O token permite que o cliente não precise enviar senha toda vez.
   Cliente envia token (seguro) em vez de email + senha (arriscado).
   Token também pode ser usado em múltiplos servidores sem sincronizar."
```

**P: "Como você testa isso?"**
```
A: "No Postman (SEM SEED.JS):
   1. Crio membro: POST /membros (sem token) → registra no banco
   2. Faço login: POST /login (sem token) → recebo token
   3. Acesso rota protegida: GET /perfil (COM token) → retorna dados
   4. Provo que funciona: só acessa com token válido"
```

**P: "E o sistema de roles? Por que admin e user?"**
```
A: "Segurança em camadas! Um usuário comum não deveria poder criar
   livros na biblioteca. Separei:
   
   - User (padrão): Pode se registrar, fazer login, ver perfil
   - Admin: Pode fazer tudo + criar/editar livros, autores, empréstimos
   
   Implementei um middleware autenticarAdmin() que verifica se o token
   tem role='admin'. Se tentar entrar como user comum, retorna 403.
   
   Exemplo: POST /livros sem ser admin → erro 403 Forbidden"
```

**P: "Como você criou um admin?"**
```
A: "Criei um endpoint POST /criar-admin que qualquer um pode chamar
   uma única vez. Ele cria um membro com role='admin' automaticamente.
   
   Também poderia ser feito via banco de dados direto:
   UPDATE Membro SET role='admin' WHERE email='admin@biblioteca.com'
   
   O admin faz login normal e recebe token com role='admin' dentro."
```

---

### 📝 Resumo Executivo (para anotar)

```
AUTENTICAÇÃO JWT + SISTEMA DE ROLES - Projeto Biblioteca

O que foi feito:

AUTENTICAÇÃO:
✅ Login real com email/senha do banco (não mockado)
✅ Senha validada com bcrypt (segura, não pode recuperar)
✅ Token JWT gerado com dados reais (id, nome, email, role)
✅ Middleware valida token em rotas protegidas
✅ Nova rota /perfil protegida como exemplo

AUTORIZAÇÃO (ROLES):
✅ Campo 'role' na tabela Membro (ENUM: 'user', 'admin')
✅ Default role='user' (segurança por padrão)
✅ Endpoint POST /criar-admin para criar primeiro admin
✅ Middleware autenticarAdmin() valida role='admin'
✅ Rotas sensíveis protegidas com autenticarAdmin()
✅ Erro 403 para usuários sem permissão admin

Como funciona:

1. Usuário cria conta: POST /membros (SEM TOKEN)
   └─> Registra com role='user' por padrão

2. Usuário faz login: POST /login (SEM TOKEN)
   └─> Recebe token com role='user'

3. User acessa rota comum: GET /perfil (COM TOKEN)
   └─> Funciona porque middleware autenticar() valida token

4. User tenta criar livro: POST /livros (COM TOKEN)
   └─> Erro 403 (precisa role='admin')

5. Admin cria conta: POST /criar-admin (SEM TOKEN)
   └─> Registra com role='admin'

6. Admin faz login: POST /login (SEM TOKEN)
   └─> Recebe token com role='admin'

7. Admin cria livro: POST /livros (COM TOKEN admin)
   └─> Sucesso porque middleware autenticarAdmin() valida role

Segurança em 3 camadas:
1. Bcrypt: Senha não pode ser recuperada
2. JWT: Token não pode ser modificado
3. Roles: Apenas admin pode executar ações sensíveis

Alinhamento com Requisitos:
- ✅ Login real (email/senha do banco)
- ✅ Bcrypt (senhas seguras)
- ✅ Token com dados do usuário
- ✅ Rota protegida funcional
- ✅ BONUS: Sistema de roles com admin
```

---

## 📊 Resumo de Rotas (Público vs Protegido vs Admin)

| Método | Rota | Autenticação | Quem Pode | Propósito |
|--------|------|--------------|----------|----------|
| **POST** | **/membros** | ❌ PÚBLICA | Qualquer um | 📝 Criar conta (registro) |
| **GET** | **/membros** | ❌ PÚBLICA | Qualquer um | Listar todos os membros |
| **GET** | **/membros/:id** | ❌ PÚBLICA | Qualquer um | Ver dados de um membro |
| **POST** | **/criar-admin** | ❌ PÚBLICA | Qualquer um* | ⚙️ Criar admin (primeira vez) |
| **POST** | **/login** | ❌ PÚBLICA | Qualquer um | 🔑 Fazer login (gera token) |
| **GET** | **/perfil** | ✅ AUTENTICADO | Usuários logados | 👤 Ver seu próprio perfil |
| **PUT/PATCH/DELETE** | **/membros/:id** | 🔐 **ADMIN** | Apenas admin | Modificar membro |
| **POST/PUT/PATCH/DELETE** | **/autores** | 🔐 **ADMIN** | Apenas admin | Modificar autores |
| **POST/PUT/PATCH/DELETE** | **/livros** | 🔐 **ADMIN** | Apenas admin | Modificar livros |
| **POST/PUT/PATCH/DELETE** | **/emprestimos** | 🔐 **ADMIN** | Apenas admin | Modificar empréstimos |

**Legenda:**
- ❌ **PÚBLICA:** Não precisa de token (qualquer um acessa)
- ✅ **AUTENTICADO:** Precisa de token válido no header `Authorization: Bearer <token>`
- 🔐 **ADMIN:** Precisa de token com `role: 'admin'`
- *Deve ser executado UMA ÚNICA VEZ para criar o primeiro admin

---

## 🔐 Sistema de Roles (Admin vs User)

O projeto possui dois tipos de usuários:

### 👤 User (Usuário Comum)
- ✅ Se registra em POST /membros
- ✅ Faz login em POST /login
- ✅ Acessa seu perfil em GET /perfil
- ❌ **NÃO pode** criar/editar livros, autores ou empréstimos

### ⚙️ Admin (Administrador)
- ✅ Se registra em POST /criar-admin
- ✅ Faz login em POST /login
- ✅ Acessa seu perfil em GET /perfil
- ✅ **PODE** criar/editar livros, autores e empréstimos
- ✅ **PODE** modificar membros

**Como identificar um admin?**
- O token JWT contém `role: "admin"`
- O response do login mostra: `"role": "admin"`

---

## 🎯 Fluxo Completo para Apresentar

```
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 0: REGISTRO (Sem token)                                   │
│ POST /membros                                                   │
│ Body: { nome, email, senha, endereco }                          │
│ └─> ✅ Membro criado no banco (senha hasheada)                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 1: LOGIN (Sem token)                                      │
│ POST /login                                                     │
│ Body: { email, senha }                                          │
│ └─> ✅ Token gerado (jwt.sign)                                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 2: ACESSAR ROTA PROTEGIDA (Com token!)                    │
│ GET /perfil                                                     │
│ Header: Authorization: Bearer <seu_token>                       │
│ └─> ✅ Middleware valida token                                  │
│ └─> ✅ Retorna dados do perfil                                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 3: USAR TOKEN EM OUTRAS ROTAS (Com token!)                │
│ POST /autores                                                   │
│ Header: Authorization: Bearer <seu_token>                       │
│ Body: { nome, dataNascimento, nacionalidade }                   │
│ └─> ✅ Cria novo autor                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## � Como Testar com Permissões de Admin

**Passo 1: Criar Admin (primeira vez)**
```
POST /criar-admin
{
  "nome": "Admin Biblioteca",
  "email": "admin@biblioteca.com",
  "senha": "senha_admin_segura_123"
}
```

**Passo 2: Fazer Login com Admin**
```
POST /login
{
  "email": "admin@biblioteca.com",
  "senha": "senha_admin_segura_123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "membro": {
    "id": 1,
    "nome": "Admin Biblioteca",
    "email": "admin@biblioteca.com",
    "role": "admin"  ← IMPORTANTE: role é 'admin'
  }
}
```

**Passo 3: Usar o Token de Admin para Criar Recursos**
```
POST /livros
Headers: Authorization: Bearer <token_admin>
Body: {
  "titulo": "Dom Casmurro",
  "anoPublicacao": 1899,
  "qtdDisponivel": 5,
  "autorIds": [1]
}

✅ Sucesso! Admin consegue criar livro.
```

**Passo 4: Usar Token de User Comum para Criar Recursos**
```
POST /livros
Headers: Authorization: Bearer <token_user_comum>
Body: {
  "titulo": "Outro Livro",
  "anoPublicacao": 2000,
  "qtdDisponivel": 3,
  "autorIds": [1]
}

❌ Erro 403 Forbidden!
Response: { "erro": "Acesso negado: requer permissões de admin" }
```

---

## �📌 Dicas Finais para Apresentação

✅ **Comece mostrando:** Crie um membro no Postman (SEM TOKEN!)
✅ **Depois mostre:** Faça login e receba o token (SEM TOKEN!)
✅ **Depois mostre:** Use o token para acessar /perfil (COM TOKEN!)
✅ **Depois mostre:** Tente sem token (erro 401)
✅ **Depois mostre:** Crie um autor com token (COM TOKEN!)
✅ **Depois explique:** Por que cada parte é segura
✅ **Termine com:** Checklist de requisitos cumpridos  

**Tempo total de apresentação:** 5-10 minutos  
**Tempo de demonstração:** 3-5 minutos  
**Tempo de explicação:** 2-5 minutos  

---

**Boa sorte! Você vai arrebentar! 🚀**
