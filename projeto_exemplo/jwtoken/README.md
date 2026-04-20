# JWT Auth — Node.js + Express + Sequelize + SQLite

Exemplo simples de autenticação com JWT, bcrypt e SQLite usando Sequelize como ORM.

## Tecnologias

- **Express** — servidor web
- **Sequelize** — ORM para o banco de dados
- **SQLite** — banco de dados
- **jsonwebtoken** — geração e validação de tokens JWT
- **bcrypt** — hash de senhas

## Instalação

```bash
npm install
```

## Configuração

Copie o arquivo de exemplo e ajuste as variáveis conforme necessário:

```bash
cp .env.example .env
```

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `JWT_SECRET` | Chave secreta para assinar os tokens JWT | — |
| `JWT_EXPIRES_IN` | Tempo de expiração do token | `1h` |
| `PORT` | Porta do servidor | `3000` |
| `DB_STORAGE` | Caminho do arquivo SQLite | `database.sqlite` |

## Executando

```bash
node server.js
```

O servidor sobe em `http://localhost:3000`.

Na primeira execução, um usuário de exemplo é criado automaticamente:

| Campo | Valor |
|-------|-------|
| Nome | João Silva |
| Email | joao@email.com |
| Senha | 123456 |

## Rotas

### `POST /login` — Pública

Autentica o usuário e retorna um token JWT válido por 1 hora.

**Body:**
```json
{
  "email": "joao@email.com",
  "senha": "123456"
}
```

**Resposta:**
```json
{
  "token": "<jwt_token>"
}
```

---

### `GET /perfil` — Protegida

Retorna os dados do usuário autenticado. Requer token JWT no header.

**Header:**
```
Authorization: Bearer <jwt_token>
```

**Resposta:**
```json
{
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@email.com"
  }
}
```

## Exemplo com curl

```bash
# 1. Login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@email.com","senha":"123456"}'

# 2. Acessar rota protegida
curl http://localhost:3000/perfil \
  -H "Authorization: Bearer <token>"
```

## Estrutura do projeto

```
jwtoken/
├── server.js        # Aplicação principal
├── database.sqlite  # Banco de dados (gerado automaticamente)
├── .env             # Variáveis de ambiente (não versionado)
├── .env.example     # Modelo de variáveis de ambiente
├── .gitignore
├── package.json
└── README.md
```
