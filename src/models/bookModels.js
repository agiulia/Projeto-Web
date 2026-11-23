
const {
    withDB,
    transaction,
    setBookAuthors,
    getBookById
} = require('./auxiliarModels');

// Criar livro
async function createBook(
    isbn,
    titulo,
    autores = [],
    thumbnail = null,
    descricao = null,
    editora = null,
    qtd_total = 1,
    qtd_disponivel = qtd_total
) {
    return withDB(db => transaction(db, async () => {
        if (!titulo || !titulo.trim()) {
            throw new Error('O título do livro é obrigatório.');
        }

        if (
            !Number.isInteger(qtd_total) ||
            !Number.isInteger(qtd_disponivel) ||
            qtd_total < 0 ||
            qtd_disponivel < 0 ||
            qtd_disponivel > qtd_total
        ) {
            throw new Error('Quantidades de livros inválidas.');
        }

        if (isbn) {
            const existingBook = await db.get(
                'SELECT * FROM books WHERE isbn = ?',
                [isbn]
            );

            if (existingBook) {
                return {
                    message: 'Este livro já está cadastrado.',
                    book: await getBookById(db, existingBook.id)
                };
            }
        }

        const result = await db.run(
            `INSERT INTO books (
                isbn,
                titulo,
                thumbnail,
                descricao,
                editora,
                qtd_total,
                qtd_disponivel
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                isbn || null,
                titulo.trim(),
                thumbnail,
                descricao,
                editora,
                qtd_total,
                qtd_disponivel
            ]
        );

        await setBookAuthors(db, result.lastID, autores);

        return {
            message: 'Livro cadastrado com sucesso!',
            book: await getBookById(db, result.lastID)
        };
    }));
}

// Buscar livro pelo título
async function searchBookbyName(titulo) {
    return withDB(db => db.all(
        `SELECT
            b.*,
            GROUP_CONCAT(DISTINCT a.nome) AS autores
         FROM books b
         LEFT JOIN book_authors ba ON ba.book_id = b.id
         LEFT JOIN authors a ON a.id = ba.author_id
         WHERE b.titulo LIKE ?
         GROUP BY b.id
         ORDER BY b.titulo`,
        [`%${titulo}%`]
    ));
}

// Buscar livro pelo autor
async function searchBookbyAuthor(autor) {
    return withDB(db => db.all(
        `SELECT
            b.*,
            GROUP_CONCAT(DISTINCT all_authors.nome) AS autores
         FROM books b
         INNER JOIN book_authors filter_ba
            ON filter_ba.book_id = b.id
         INNER JOIN authors filter_a
            ON filter_a.id = filter_ba.author_id
         LEFT JOIN book_authors all_ba
            ON all_ba.book_id = b.id
         LEFT JOIN authors all_authors
            ON all_authors.id = all_ba.author_id
         WHERE filter_a.nome LIKE ?
         GROUP BY b.id
         ORDER BY b.titulo`,
        [`%${autor}%`]
    ));
}

// Buscar livro pela editora
async function searchBookbyEditor(editora) {
    return withDB(db => db.all(
        `SELECT
            b.*,
            GROUP_CONCAT(DISTINCT a.nome) AS autores
         FROM books b
         LEFT JOIN book_authors ba ON ba.book_id = b.id
         LEFT JOIN authors a ON a.id = ba.author_id
         WHERE b.editora LIKE ?
         GROUP BY b.id
         ORDER BY b.titulo`,
        [`%${editora}%`]
    ));
}

// Atualizar informações do livro
async function updateBook(
    id,
    titulo,
    autores,
    editora,
    qtd_total,
    qtd_disponivel
) {
    return withDB(db => transaction(db, async () => {
        const book = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [id]
        );

        if (!book) {
            throw new Error('Livro não encontrado.');
        }

        const newTitulo = titulo ?? book.titulo;
        const newEditora = editora ?? book.editora;
        const newQtdTotal = qtd_total ?? book.qtd_total;
        const newQtdDisponivel =
            qtd_disponivel ?? book.qtd_disponivel;

        if (!newTitulo || !newTitulo.trim()) {
            throw new Error('O título do livro é obrigatório.');
        }

        if (
            !Number.isInteger(newQtdTotal) ||
            !Number.isInteger(newQtdDisponivel) ||
            newQtdTotal < 0 ||
            newQtdDisponivel < 0 ||
            newQtdDisponivel > newQtdTotal
        ) {
            throw new Error('Quantidades de livros inválidas.');
        }

        const activeLoans = await db.get(
            `SELECT COUNT(*) AS total
             FROM loans
             WHERE book_id = ?
             AND status = 'aceito'`,
            [id]
        );

        if (newQtdTotal - newQtdDisponivel !== activeLoans.total) {
            throw new Error(
                'As quantidades devem considerar os empréstimos ativos.'
            );
        }

        await db.run(
            `UPDATE books
             SET titulo = ?,
                 editora = ?,
                 qtd_total = ?,
                 qtd_disponivel = ?
             WHERE id = ?`,
            [
                newTitulo.trim(),
                newEditora,
                newQtdTotal,
                newQtdDisponivel,
                id
            ]
        );

        if (autores !== undefined && autores !== null) {
            await setBookAuthors(db, id, autores);
        }

        return {
            message: 'Livro atualizado com sucesso!',
            book: await getBookById(db, id)
        };
    }));
}

// Buscar livro pelo ID
async function searchBookbyId(id) {
    return withDB(db => getBookById(db, id));
}

// Excluir livro
async function deleteBook(id) {
    return withDB(db => transaction(db, async () => {
        const book = await db.get(
            'SELECT id FROM books WHERE id = ?',
            [id]
        );

        if (!book) {
            throw new Error('Livro não encontrado.');
        }

        const loans = await db.get(
            `SELECT COUNT(*) AS total
             FROM loans
             WHERE book_id = ?`,
            [id]
        );

        if (loans.total > 0) {
            throw new Error(
                'Não é possível excluir um livro que possui histórico de empréstimos.'
            );
        }

        await db.run(
            'DELETE FROM book_authors WHERE book_id = ?',
            [id]
        );

        await db.run(
            'DELETE FROM books WHERE id = ?',
            [id]
        );

        return {
            message: 'Livro excluído com sucesso!'
        };
    }));
}

// Selecionar todos os livros
async function getAllBooks() {
    return withDB(db => db.all(
        `SELECT
            b.*,
            GROUP_CONCAT(DISTINCT a.nome) AS autores
         FROM books b
         LEFT JOIN book_authors ba ON ba.book_id = b.id
         LEFT JOIN authors a ON a.id = ba.author_id
         GROUP BY b.id
         ORDER BY b.titulo`
    ));
}

module.exports = {
    createBook,
    searchBookbyName,
    searchBookbyAuthor,
    searchBookbyEditor,
    searchBookbyId,
    updateBook,
    deleteBook,
    getAllBooks
};