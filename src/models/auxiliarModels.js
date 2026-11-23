
const { openDB } = require('../config/database');

// Executar operações e fechar a conexão automaticamente
async function withDB(callback) {
    const db = await openDB();

    try {
        return await callback(db);
    } finally {
        await db.close();
    }
}

// Executar operações dentro de uma transação
async function transaction(db, callback) {
    await db.exec('BEGIN IMMEDIATE');

    try {
        const result = await callback();
        await db.exec('COMMIT');
        return result;
    } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
    }
}

// Normalizar os autores: aceita array ou string
function normalizeAuthors(authors) {
    if (!authors) return [];

    const list = Array.isArray(authors)
        ? authors
        : String(authors).split(',');

    const unique = new Map();

    for (const author of list) {
        const name = String(author).trim();

        if (name) {
            unique.set(name.toLocaleLowerCase('pt-BR'), name);
        }
    }

    return [...unique.values()];
}

// Associar autores a um livro
async function setBookAuthors(db, bookId, authors) {
    const authorNames = normalizeAuthors(authors);

    await db.run(
        'DELETE FROM book_authors WHERE book_id = ?',
        [bookId]
    );

    for (const name of authorNames) {
        await db.run(
            `INSERT INTO authors (nome)
             VALUES (?)
             ON CONFLICT(nome) DO NOTHING`,
            [name]
        );

        const author = await db.get(
            `SELECT id FROM authors
             WHERE nome = ? COLLATE NOCASE`,
            [name]
        );

        if (!author) {
            throw new Error(
                `Não foi possível cadastrar o autor: ${name}`
            );
        }

        await db.run(
            `INSERT OR IGNORE INTO book_authors
             (book_id, author_id)
             VALUES (?, ?)`,
            [bookId, author.id]
        );
    }
}

// Buscar livro com seus autores
async function getBookById(db, id) {
    return db.get(
        `SELECT
             b.*,
             GROUP_CONCAT(DISTINCT a.nome) AS autores
         FROM books b
         LEFT JOIN book_authors ba ON ba.book_id = b.id
         LEFT JOIN authors a ON a.id = ba.author_id
         WHERE b.id = ?
         GROUP BY b.id`,
        [id]
    );
}

module.exports = {
    withDB,
    transaction,
    normalizeAuthors,
    setBookAuthors,
    getBookById
};