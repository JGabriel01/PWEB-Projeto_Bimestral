const express = require("express");
const jsonfile = require("jsonfile");

const app = express();
app.use(express.json());

const port = 3000;
const DADOS_PATH = "./banco.json";

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


async function encontraLivroPorId(dadosCompletos, livroId) {
  const livros = dadosCompletos.livros || [];
  return livros.find((l) => l.id === livroId);
}

async function ajustarDisponibilidadeLivro(dadosCompletos, livroId, qtd) {
  const livro = (dadosCompletos.livros || []).find((l) => l.id === livroId);
  if (!livro) return false;
  // garante que qtdDisponivel seja número
  livro.qtdDisponivel = parseInt(livro.qtdDisponivel || 0) + parseInt(qtd);
  return true;
}

app.get("/livros", async (req, res) => {
  const dadosCompletos = await lerDados();
  res.status(200).json(dadosCompletos.livros);
});

app.get("/livros/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const dadosCompletos = await lerDados();
  const livro = dadosCompletos.livros.find((l) => l.id === id);

  if (livro) {
    res.status(200).json(livro);
  } else {
    res.status(404).json({ mensagem: `Livro com ID ${id} não encontrado.` });
  }
});

app.post("/livros", async (req, res) => {
  const { titulo, anoPublicacao, qtdDisponivel } = req.body || {};

  if (!titulo || !anoPublicacao || qtdDisponivel === undefined) {
    return res
      .status(400)
      .json({ mensagem: "Todos os campos são obrigatórios." });
  }

  const dadosCompletos = await lerDados();
  const livros = dadosCompletos.livros;

  const novoLivro = {
    id: Date.now(),
    titulo,
    anoPublicacao: parseInt(anoPublicacao),
    qtdDisponivel: parseInt(qtdDisponivel),
  };

  livros.push(novoLivro);
  await escreverDados(dadosCompletos);

  res.status(201).json(novoLivro);
});

app.put("/livros/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const dadosCompletos = await lerDados();
  let livros = dadosCompletos.livros;

  const index = livros.findIndex((l) => l.id === id);

  if (index === -1) {
    return res.status(404).json({
      mensagem: `Livro com ID ${id} não encontrado para atualização.`,
    });
  }

  const { titulo, anoPublicacao, qtdDisponivel } = req.body || {};

  if (!titulo || !anoPublicacao || qtdDisponivel === undefined) {
    return res.status(400).json({
      mensagem: "Para o PUT, todos os campos do livro são obrigatórios!",
    });
  }

  const livroAtualizado = {
    id: id,
    titulo,
    anoPublicacao: parseInt(anoPublicacao),
    qtdDisponivel: parseInt(qtdDisponivel),
  };

  livros[index] = livroAtualizado;
  await escreverDados(dadosCompletos);

  res.status(200).json(livroAtualizado);
});

app.patch("/livros/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const dadosCompletos = await lerDados();
  let livros = dadosCompletos.livros;
  const { titulo, anoPublicacao, qtdDisponivel } = req.body || {};

  const index = livros.findIndex((l) => l.id === id);

  if (index === -1) {
    return res.status(404).json({
      mensagem: `Livro com ID ${id} não encontrado para atualização parcial.`,
    });
  }

  if (!titulo && !anoPublicacao && qtdDisponivel === undefined) {
    return res.status(400).json({
      mensagem:
        "Para o PATCH, pelo menos um campo do livro deve ser fornecido!",
    });
  }

  if (titulo) {
    livros[index].titulo = titulo;
  }

  if (anoPublicacao) {
    livros[index].anoPublicacao = parseInt(anoPublicacao);
  }

  if (qtdDisponivel || qtdDisponivel === 0) {
    livros[index].qtdDisponivel = parseInt(qtdDisponivel);
  }

  await escreverDados(dadosCompletos);

  res.status(200).json(livros[index]);
});

app.delete("/livros/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const dadosCompletos = await lerDados();
  let livros = dadosCompletos.livros;

  const index = livros.findIndex((l) => l.id === id);

  if (index === -1) {
    return res
      .status(404)
      .json({ mensagem: `Livro com ID ${id} não encontrado para remoção.` });
  }

  livros.splice(index, 1);
  await escreverDados(dadosCompletos);

  res.status(200).send({ mensagem: "Livro removido com sucesso." });
});

// Membro

definirObter('/membros', 'membros');

definirSelecionarUm('/membros/:id', 'membros', 'Membro');

definirDelete('/membros/:id', 'membros', 'Membro');


app.post('/membros', async (req, res) => {
    const { nome, email, endereco} = req.body || {};

    if (!nome || !email || !endereco) {
        return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
    }

    const dadosCompletos = await lerDados();
    const membros = dadosCompletos.membros;

    const novoMembro = {
        id: Date.now(),
        nome,
        email,
        endereco
    };

    membros.push(novoMembro);
    await escreverDados(dadosCompletos);

    res.status(201).json(novoMembro);
});


app.put('/membros/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const dadosCompletos = await lerDados();
    let membros = dadosCompletos.membros;

    const index = membros.findIndex(l => l.id === id);

    if (index === -1) {
        return res.status(404).json({ mensagem: `Membro com ID ${id} não encontrado para atualização.` });
    }

    const { nome, email, endereco } = req.body || {};

    if (!nome || !email || !endereco) {
        return res.status(400).json({ mensagem: "Para o PUT, todos os campos do livro são obrigatórios!" });
    }

    const membroAtualizado = {
        id: id,
        nome,
        email,
        endereco
    };

    membros[index] = membroAtualizado;
    await escreverDados(dadosCompletos);

    res.status(200).json(membroAtualizado);
});


app.patch('/membros/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const dadosCompletos = await lerDados();
    let membros = dadosCompletos.membros;
    const { nome, email, endereco} = req.body || {};

    const index = membros.findIndex(l => l.id === id);

    if (index === -1) {
        return res.status(404).json({ mensagem: `Membro com ID ${id} não encontrado para atualização parcial.` });
    }

    if (!nome && !email && !endereco) {
        return res.status(400).json({ mensagem: "Para o PATCH, pelo menos um campo do livro deve ser fornecido!" });
    }

    if (nome) {
        membros[index].nome = nome;
    }

    if (email) {
        membros[index].email = email;
    }

    if (endereco) {
        membros[index].endereco = endereco;
    }

    await escreverDados(dadosCompletos);

    res.status(200).json(membros[index]);
});
// Coringas HAHAHA


function definirObter(rota, entidade) {
    app.get(rota, async (req, res) => {
        const dadosCompletos = await lerDados();
        res.status(200).json(dadosCompletos[entidade]);
    });
}


function definirSelecionarUm(rota, entidade, nomeEntidade) {
    app.get(rota, async (req, res) => {
        const id = parseInt(req.params.id);
        const dadosCompletos = await lerDados();
        const entidadeObtida = dadosCompletos[entidade].find(e => e.id === id);

        if (entidadeObtida) {
            res.status(200).json(entidadeObtida);
        } else {
            res.status(404).json({ mensagem: `${nomeEntidade} com ID ${id} não encontrado.` });
        }
    });
}


function definirDelete(rota, entidade, nomeEntidade) {
    app.delete(rota, async (req, res) => {
        const id = parseInt(req.params.id);
        const dadosCompletos = await lerDados();
        let entidades = dadosCompletos[entidade];

        const index = entidades.findIndex(e => e.id === id);

        if (index === -1) {
            return res.status(404).json({ mensagem: `${nomeEntidade} com ID ${id} não encontrado para remoção.` });
        }

        entidades.splice(index, 1);
        await escreverDados(dadosCompletos);

        res.status(200).send({ mensagem: nomeEntidade + " removido com sucesso." });
    });
}

// Empréstimo

app.get("/emprestimos", async (req, res) => {
  const dadosCompletos = await lerDados();
  res.status(200).json(dadosCompletos.emprestimos);
});

app.get("/emprestimos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const dadosCompletos = await lerDados();
  const emprestimo = dadosCompletos.emprestimos.find((e) => e.id === id);

  if (emprestimo) {
    res.status(200).json(emprestimo);
  } else {
    res
      .status(404)
      .json({ mensagem: `Empréstimo com ID ${id} não encontrado.` });
  }
});

app.post("/emprestimos", async (req, res) => {
  const {
    dataEmprestimo,
    tempoMinDevolucao,
    tempoMaxDevolucao,
    livroId,
    membroId,
  } = req.body || {};


  if (
    !livroId ||
    !membroId ||
    !dataEmprestimo ||
    tempoMinDevolucao === undefined ||
    tempoMaxDevolucao === undefined
  ) {
    return res
      .status(400)
      .json({
        mensagem:
          "Todos os campos são obrigatórios (incluindo membroId e livroId).",
      });
  }

  const dadosCompletos = await lerDados();
  const emprestimos = dadosCompletos.emprestimos;

  const livro = await encontraLivroPorId(dadosCompletos, parseInt(livroId));
  if (!livro) {
    return res.status(404).json({
      mensagem: `Livro com ID ${livroId} não encontrado para associar ao empréstimo.`,
    });
  }

  if (parseInt(livro.qtdDisponivel || 0) <= 0) {
    return res.status(400).json({
      mensagem: `Livro com ID ${livroId} não tem unidades disponíveis.`,
    });
  }

  const novoEmprestimo = {
    id: Date.now(),
    dataEmprestimo,
    tempoMinDevolucao: parseInt(tempoMinDevolucao),
    tempoMaxDevolucao: parseInt(tempoMaxDevolucao),
    livroId: parseInt(livroId),
    membroId: parseInt(membroId),
  };

  emprestimos.push(novoEmprestimo);
  await ajustarDisponibilidadeLivro(dadosCompletos, novoEmprestimo.livroId, -1);
  await escreverDados(dadosCompletos);

  res.status(201).json(novoEmprestimo);
});

app.put("/emprestimos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const dadosCompletos = await lerDados();
  let emprestimos = dadosCompletos.emprestimos;

  const index = emprestimos.findIndex((e) => e.id === id);

  if (index === -1) {
    return res.status(404).json({
      mensagem: `Empréstimo com ID ${id} não encontrado para atualização.`,
    });
  }

  const {
    dataEmprestimo,
    tempoMinDevolucao,
    tempoMaxDevolucao,
    livroId,
    membroId,
  } = req.body || {};

  if (
    !dataEmprestimo ||
    tempoMinDevolucao === undefined ||
    tempoMaxDevolucao === undefined ||
    livroId === undefined ||
    membroId === undefined
  ) {
    return res.status(400).json({
      mensagem: "Para o PUT, todos os campos do empréstimo são obrigatórios!",
    });
  }

  if (!livroId || !membroId) {
    return res.status(400).json({
      mensagem:
        "Os campos 'livroId' e 'membroId' são obrigatórios para o PUT de empréstimo.",
    });
  }

  const livro = await encontraLivroPorId(dadosCompletos, parseInt(livroId));
  if (!livro) {
    return res.status(404).json({
      mensagem: `Livro com ID ${livroId} não encontrado para associar ao empréstimo.`,
    });
  }

  const emprestimoAtualizado = {
    id: id,
    dataEmprestimo,
    tempoMinDevolucao: parseInt(tempoMinDevolucao),
    tempoMaxDevolucao: parseInt(tempoMaxDevolucao),
    livroId: parseInt(livroId),
    membroId: parseInt(membroId),
  };

  const livroAntigoId = emprestimos[index].livroId;
  if (livroAntigoId && livroAntigoId !== emprestimoAtualizado.livroId) {
    await ajustarDisponibilidadeLivro(dadosCompletos, livroAntigoId, 1);
    if (parseInt(livro.qtdDisponivel || 0) <= 0) {
      return res.status(400).json({
        mensagem: `Livro com ID ${livroId} não tem unidades disponíveis para associar ao empréstimo.`,
      });
    }
    await ajustarDisponibilidadeLivro(
      dadosCompletos,
      emprestimoAtualizado.livroId,
      -1
    );
  }

  emprestimos[index] = emprestimoAtualizado;
  await escreverDados(dadosCompletos);

  res.status(200).json(emprestimoAtualizado);
});

app.patch("/emprestimos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const dadosCompletos = await lerDados();
  let emprestimos = dadosCompletos.emprestimos;
  const {
    dataEmprestimo,
    tempoMinDevolucao,
    tempoMaxDevolucao,
    livroId,
    membroId,
  } = req.body || {};

  const index = emprestimos.findIndex((e) => e.id === id);

  if (index === -1) {
    return res.status(404).json({
      mensagem: `Empréstimo com ID ${id} não encontrado para atualização parcial.`,
    });
  }

  if (
    !dataEmprestimo &&
    tempoMinDevolucao === undefined &&
    tempoMaxDevolucao === undefined
  ) {
    return res.status(400).json({
      mensagem:
        "Para o PATCH, pelo menos um campo do empréstimo deve ser fornecido!",
    });
  }

  let novoLivro = null;
  if (livroId !== undefined) {
    novoLivro = await encontraLivroPorId(dadosCompletos, parseInt(livroId));
    if (!novoLivro) {
      return res.status(404).json({
        mensagem: `Livro com ID ${livroId} não encontrado para associar ao empréstimo.`,
      });
    }
    const emprestimoAtual = emprestimos[index];
    if (emprestimoAtual.livroId !== parseInt(livroId)) {
      if (parseInt(novoLivro.qtdDisponivel || 0) <= 0) {
        return res.status(400).json({
          mensagem: `Livro com ID ${livroId} não tem unidades disponíveis.`,
        });
      }
      await ajustarDisponibilidadeLivro(
        dadosCompletos,
        emprestimoAtual.livroId,
        1
      );
      await ajustarDisponibilidadeLivro(dadosCompletos, parseInt(livroId), -1);
      emprestimos[index].livroId = parseInt(livroId);
    }
  }

  if (membroId !== undefined) {
    emprestimos[index].membroId = parseInt(membroId);
  }

  if (dataEmprestimo) {
    emprestimos[index].dataEmprestimo = dataEmprestimo;
  }

  if (tempoMinDevolucao) {
    emprestimos[index].tempoMinDevolucao = parseInt(tempoMinDevolucao);
  }

  if (tempoMaxDevolucao) {
    emprestimos[index].tempoMaxDevolucao = parseInt(tempoMaxDevolucao);
  }

  await escreverDados(dadosCompletos);

  res.status(200).json(emprestimos[index]);
});

app.delete("/emprestimos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const dadosCompletos = await lerDados();
  let emprestimos = dadosCompletos.emprestimos;

  const index = emprestimos.findIndex((e) => e.id === id);

  if (index === -1) {
    return res.status(404).json({
      mensagem: `Empréstimo com ID ${id} não encontrado para remoção.`,
    });
  }

  
  const livroId = emprestimos[index] && emprestimos[index].livroId;
  if (livroId) {
    await ajustarDisponibilidadeLivro(dadosCompletos, livroId, 1);
  }

  emprestimos.splice(index, 1);

  await escreverDados(dadosCompletos);

  res.status(200).send({ mensagem: "Empréstimo removido com sucesso." });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});