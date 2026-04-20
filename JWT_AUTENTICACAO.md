# Autenticação JWT - Sistema de Gerenciamento de Biblioteca

## Visão Geral
Este documento descreve como usar o sistema de autenticação JWT (JSON Web Tokens) implementado no projeto.

## 1. Configuração Inicial

### 1.1 Instalação de Dependências
Certifique-se de ter as seguintes dependências instaladas:

```bash
npm install
```

As dependências são:
- `jsonwebtoken` - Para gerar e verificar tokens JWT
- `bcrypt` - Para hash de senhas (preparado para futuras implementações)
- `dotenv` - Para carregamento de variáveis de ambiente

### 1.2 Arquivo .env
O arquivo `.env` contém as configurações necessárias:

```env
JWT_SECRET=sua_chave_secreta_super_segura_2024
JWT_EXPIRES_IN=24h
PORT=3000
```

**Importante:** Nunca compartilhe ou commite o arquivo `.env` em repositórios públicos. Ele está no `.gitignore` por segurança.

## 2. Autenticação

### 2.1 Obter Token (Login)

**Endpoint:** `POST /login`

**Request:**
```json
{
  "usuario": "admin",
  "senha": "admin123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (401 Unauthorized):**
```json
{
  "erro": "Credenciais inválidas"
}
```

### 2.2 Usando o Token

Após obter o token, inclua-o em todas as requisições protegidas no header `Authorization`:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Rotas Protegidas

As seguintes rotas agora requerem autenticação JWT:

### 3.1 Autores (Protegidas)
- `POST /autores` - Criar novo autor
- `PUT /autores/:id` - Atualizar autor
- `PATCH /autores/:id` - Atualizar parcialmente
- `DELETE /autores/:id` - Deletar autor

**Rotas públicas (sem autenticação):**
- `GET /autores` - Listar todos
- `GET /autores/:id` - Obter um autor

### 3.2 Livros (Protegidas)
- `POST /livros` - Criar novo livro
- `PUT /livros/:id` - Atualizar livro
- `PATCH /livros/:id` - Atualizar parcialmente
- `DELETE /livros/:id` - Deletar livro

**Rotas públicas (sem autenticação):**
- `GET /livros` - Listar todos
- `GET /livros/:id` - Obter um livro

## 4. Exemplos de Uso

### Exemplo 1: Login e Obter Token
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"usuario": "admin", "senha": "admin123"}'
```

### Exemplo 2: Criar um Autor (com autenticação)
```bash
curl -X POST http://localhost:3000/autores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "nome": "Machado de Assis",
    "dataNascimento": "1839-06-21",
    "nacionalidade": "Brasileiro"
  }'
```

### Exemplo 3: Listar Autores (sem autenticação)
```bash
curl -X GET http://localhost:3000/autores
```

## 5. Tratamento de Erros

### Token Não Fornecido
**Status:** 401 Unauthorized
```json
{
  "erro": "Token não fornecido"
}
```

### Token Inválido ou Expirado
**Status:** 401 Unauthorized
```json
{
  "erro": "Token inválido ou expirado"
}
```

## 6. Segurança

- **JWT_SECRET:** Mude a chave padrão para uma chave forte e única em produção
- **JWT_EXPIRES_IN:** Configure o tempo de expiração do token conforme necessário
- **HTTPS:** Use HTTPS em produção para proteger tokens em trânsito
- **Variáveis de Ambiente:** Sempre use `.env` para dados sensíveis

## 7. Fluxo de Autenticação

```
Cliente faz login com credenciais
        ↓
Servidor valida credenciais
        ↓
Servidor gera token JWT
        ↓
Cliente armazena token
        ↓
Cliente inclui token em requisições protegidas
        ↓
Servidor valida token
        ↓
Servidor processa requisição ou retorna 401
```

## 8. Próximos Passos

Para melhorar o sistema de autenticação:
- Implementar banco de dados de usuários com senhas hash usando bcrypt
- Adicionar refresh tokens para renovar sessões
- Implementar log de auditoria
- Adicionar rate limiting nas rotas de login
- Implementar 2FA (autenticação de dois fatores)

---
**Versão:** 1.0  
**Última atualização:** 2024
