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

// Normalizar os autores (array ou string)
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
async function setBookAuthors(db, bookId, authors = []) {
    for (const author of authors) {
        // Ignorar valores vazios
        if (!author || !author.trim()) {
            continue;
        }

        const authorName = author.trim();

        // Verificar se o autor já existe
        let existingAuthor = await db.get(
            `SELECT id
             FROM authors
             WHERE nome = ? COLLATE NOCASE`,
            [authorName]
        );

        // Criar o autor caso não exista
        if (!existingAuthor) {
            const result = await db.run(
                `INSERT INTO authors (nome)
                 VALUES (?)`,
                [authorName]
            );

            existingAuthor = {
                id: result.lastID
            };
        }

        await db.run(
            `INSERT OR IGNORE INTO book_authors
             (book_id, author_id)
             VALUES (?, ?)`,
            [bookId, existingAuthor.id]
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