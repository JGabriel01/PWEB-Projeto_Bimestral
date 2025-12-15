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
    qtdDisponivel INT,
    FOREIGN KEY (autorId) REFERENCES autores(id)
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
    endereco TEXT NOT NULL
);

-- Tabela para Empréstimos
CREATE TABLE emprestimos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    dataEmprestimo DATE NOT NULL,
    tempoMinDevolucao INT NOT NULL,
    tempoMaxDevolucao INT NOT NULL,

    livroId INT NOT NULL,
    membroId INT NOT NULL,

    FOREIGN KEY (livroId) REFERENCES livros(id),
    FOREIGN KEY (membroId) REFERENCES membros(id)
);