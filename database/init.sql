-- Active: 1765846432465@@127.0.0.1@3307@banco
-- Tabela para Autores
CREATE TABLE autores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    dataNascimento VARCHAR(4) NOT NULL, -- Mantendo como string para o ano (1982, 1965, etc.)
    nacionalidade VARCHAR(100)
);

-- Tabela para Livros
CREATE TABLE livros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    anoPublicacao INT,
    qtdDisponivel INT
);

-- Tabela PIVÔ (Ligação N:N)
CREATE TABLE livro_autor (
    livro_id INT NOT NULL,
    autor_id INT NOT NULL,
    PRIMARY KEY (livro_id, autor_id),
    FOREIGN KEY (livro_id) REFERENCES livros(id) ON DELETE CASCADE,
    FOREIGN KEY (autor_id) REFERENCES autores(id) ON DELETE CASCADE
);

-- Tabela para Membros
CREATE TABLE membros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    endereco TEXT 
);

-- Tabela para Empréstimos

CREATE TABLE emprestimos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- Chaves Estrangeiras para as relações: Um Empréstimo está associado a um Livro e um Membro
    livroId INT NOT NULL,
    membroId INT NOT NULL,
    -- Data do Empréstimo
    dataEmprestimo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Atributos de Tempo (Apenas informativos, sem lógica de validação no backend)
    tempoMinDevolucao INT NULL, -- Ex: 7 (dias)
    tempoMaxDevolucao INT NULL, -- Ex: 14 (dias)
    -- Relações de Integridade (Foreign Keys)
    FOREIGN KEY (livroId) REFERENCES livros(id) ON DELETE CASCADE,
    FOREIGN KEY (membroId) REFERENCES membros(id) ON DELETE CASCADE
);