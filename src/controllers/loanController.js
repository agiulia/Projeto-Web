const { createBook } = require('../models/bookModels');
const { createLoan } = require('../models/loanModels');

// POST /emprestimos
async function requestLoan(req, res) {
    const { isbn, titulo, autores, thumbnail, descricao } = req.body;

    try {
        const listaAutores = autores ? autores.split(', ') : [];

        // cadastra o livro se ainda não existir (ou reaproveita o que já existe)
        const { book } = await createBook(
            isbn,
            titulo,
            listaAutores,
            thumbnail || null,
            descricao || null
        );

        // cria o empréstimo como pendente para quem está logado
        await createLoan(req.session.usuario.id, book.id);

        res.redirect('/usuarios/perfil');
    } catch (err) {
        console.error(err);
        res.status(400).send(`${err.message} <a href="/">Voltar</a>`);
    }
}

module.exports = { requestLoan };