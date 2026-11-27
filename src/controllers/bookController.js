const { searchBooks, searchBooksByAuthor, } = require('../services/googleBooksService');
const {
    createBook,
    updateBook,
    deleteBook,
    getAllBooks,
    searchBookbyId,
    searchBookbyName,
    searchBookbyAuthor,
    searchBookbyEditor,
} = require('../models/bookModels');

async function buscar(req, res) {
    const busca = req.query.busca;
    const pesquisarPor = req.query.pesquisarPor;
    if (!busca) {
        return res.redirect('/');
    }

    try {
        if (pesquisarPor == "autor"){
            const livros = await searchBooksByAuthor(busca);
        res.render('index', { livros, busca, erro: null });
        } else {
        const livros = await searchBooks(busca);
        res.render('index', { livros, busca, erro: null });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).render('index', {
            livros: [],
            busca,
            erro: 'Não foi possível buscar os livros.'
        });
    }
}

function toInt(value) {
    return value === undefined || value === '' ? undefined : Number(value);
}

function handleError(res, err) {
    console.error(err);

    if (err.code && String(err.code).startsWith('SQLITE')) {
        return res.status(500).json({ error: 'Erro no banco de dados.' });
    }

    const status = err.message.includes('não encontrado') ? 404 : 400;
    res.status(status).json({ error: err.message });
}

async function listBooks(req, res) {
    try {
        const { titulo, autor, editora } = req.query;
        let books;

        if (titulo) books = await searchBookbyName(titulo);
        else if (autor) books = await searchBookbyAuthor(autor);
        else if (editora) books = await searchBookbyEditor(editora);
        else books = await getAllBooks();

        res.json(books);
    } catch (err) {
        handleError(res, err);
    }
}

// GET /livros/:id
async function showBook(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'ID inválido.' });
        }

        const book = await searchBookbyId(id);

        if (!book) {
            return res.status(404).json({ error: 'Livro não encontrado.' });
        }

        res.json(book);
    } catch (err) {
        handleError(res, err);
    }
}

// POST /livros
async function addBook(req, res) {
    try {
        const { isbn, titulo, autores, thumbnail, descricao, editora } = req.body;
        const qtd_total = toInt(req.body.qtd_total) ?? 1;

        const result = await createBook(
            isbn, titulo, autores, thumbnail, descricao, editora, qtd_total
        );

        res.status(201).json(result);
    } catch (err) {
        handleError(res, err);
    }
}

// PUT /livros/:id
async function editBook(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'ID inválido.' });
        }

        const { titulo, autores, editora } = req.body;

        const result = await updateBook(
            id,
            titulo,
            autores,
            editora,
            toInt(req.body.qtd_total),
            toInt(req.body.qtd_disponivel)
        );

        res.json(result);
    } catch (err) {
        handleError(res, err);
    }
}

// DELETE /livros/:id
async function removeBook(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'ID inválido.' });
        }

        const result = await deleteBook(id);
        res.json(result);
    } catch (err) {
        handleError(res, err);
    }
}

module.exports = { buscar, listBooks, showBook, addBook, editBook, removeBook };