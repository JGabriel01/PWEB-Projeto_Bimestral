const express = require('express');
const jsonfile = require('jsonfile');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = 3000;
const DADOS_PATH = './banco.json';

async function lerDados() {
    try {
        return await jsonfile.readFile(DADOS_PATH);
    } catch (error) {
        console.error("Erro ao ler dados:", error);
        return { livros: [] };
    }
}

async function escreverDados(novosDados) {
    try {
        await jsonfile.writeFile(DADOS_PATH, novosDados, { spaces: 2 });
    } catch (error) {
        console.error("Erro ao escrever dados:", error);
    }
}

app.get('/livros', async (req, res) => {
    const dadosCompletos = await lerDados();
    res.status(200).json(dadosCompletos.livros);
});

app.get('/livros/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const dadosCompletos = await lerDados();
    const livro = dadosCompletos.livros.find(l => l.id === id);

    if (livro) {
        res.status(200).json(livro);
    } else {
        res.status(404).json({ mensagem: `Livro com ID ${id} não encontrado.` });
    }
});

app.post('/livros', async (req, res) => {
    const { titulo, anoPublicacao, isbn, qtdDisponivel } = req.body;

    if (!titulo || !anoPublicacao || !isbn || qtdDisponivel === undefined) {
        return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
    }

    const dadosCompletos = await lerDados();
    const livros = dadosCompletos.livros;

    const novoLivro = {
        id: Date.now(),
        titulo,
        anoPublicacao: parseInt(anoPublicacao),
        isbn,
        qtdDisponivel: parseInt(qtdDisponivel)
    };

    livros.push(novoLivro);
    await escreverDados(dadosCompletos);

    res.status(201).json(novoLivro);
});

app.put('/livros/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const dadosCompletos = await lerDados();
    let livros = dadosCompletos.livros;

    const index = livros.findIndex(l => l.id === id);

    if (index === -1) {
        return res.status(404).json({ mensagem: `Livro com ID ${id} não encontrado para atualização.` });
    }

    const { titulo, anoPublicacao, isbn, qtdDisponivel } = req.body;

    if (!titulo || !anoPublicacao || !isbn || qtdDisponivel === undefined) {
        return res.status(400).json({ mensagem: "Para o PUT, todos os campos do livro são obrigatórios, incluindo ID (no path)." });
    }

    const livroAtualizado = {
        id: id,
        titulo,
        anoPublicacao: parseInt(anoPublicacao),
        isbn,
        qtdDisponivel: parseInt(qtdDisponivel)
    };

    livros[index] = livroAtualizado;
    await escreverDados(dadosCompletos);

    res.status(200).json(livroAtualizado);
});

app.patch('/livros/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const dadosCompletos = await lerDados();
    let livros = dadosCompletos.livros;

    const index = livros.findIndex(l => l.id === id);

    if (index === -1) {
        return res.status(404).json({ mensagem: `Livro com ID ${id} não encontrado para atualização parcial.` });
    }

    const livroAtualizado = {
        ...livros[index],
        ...req.body,
        id: id
    };

    if (livroAtualizado.anoPublicacao) livroAtualizado.anoPublicacao = parseInt(livroAtualizado.anoPublicacao);
    if (livroAtualizado.qtdDisponivel || livroAtualizado.qtdDisponivel === 0) livroAtualizado.qtdDisponivel = parseInt(livroAtualizado.qtdDisponivel);

    livros[index] = livroAtualizado;
    await escreverDados(dadosCompletos);

    res.status(200).json(livroAtualizado);
});

app.delete('/livros/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const dadosCompletos = await lerDados();
    let livros = dadosCompletos.livros;

    const index = livros.findIndex(l => l.id === id);

    if (index === -1) {
        return res.status(404).json({ mensagem: `Livro com ID ${id} não encontrado para remoção.` });
    }

    livros.splice(index, 1);
    await escreverDados(dadosCompletos);

    res.status(204).send();
});


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
