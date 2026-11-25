
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const { searchBooks } = require('../services/googleBooksService');

const dbPath = path.join(__dirname, 'banco.db');

async function openDB() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await db.exec('PRAGMA foreign_keys = ON');

    return db;
}

async function initializeDB() {
    const db = await openDB();
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(50) NOT NULL,
                email VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user', 'admin'))
            );

            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                isbn VARCHAR(20) UNIQUE,
                titulo VARCHAR(225) NOT NULL,
                thumbnail TEXT,
                descricao TEXT,
                editora VARCHAR(100),
                qtd_total INTEGER NOT NULL DEFAULT 1
                    CHECK (qtd_total >= 0),
                qtd_disponivel INTEGER NOT NULL DEFAULT 1
                    CHECK (
                        qtd_disponivel >= 0
                        AND qtd_disponivel <= qtd_total
                    )
            );

            CREATE TABLE IF NOT EXISTS authors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(225) NOT NULL COLLATE NOCASE UNIQUE
            );

            CREATE TABLE IF NOT EXISTS book_authors (
                book_id INTEGER NOT NULL,
                author_id INTEGER NOT NULL,

                PRIMARY KEY (book_id, author_id),

                FOREIGN KEY (book_id)
                    REFERENCES books(id) ON DELETE CASCADE,

                FOREIGN KEY (author_id)
                    REFERENCES authors(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS loans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,

                status VARCHAR(20) NOT NULL DEFAULT 'pendente'
                    CHECK (
                        status IN (
                            'pendente',
                            'aceito',
                            'recusado',
                            'devolvido'
                        )
                    ),

                prazo_dias INTEGER NOT NULL DEFAULT 7
                    CHECK (prazo_dias BETWEEN 1 AND 30),

                data_solicitacao DATETIME
                    NOT NULL DEFAULT CURRENT_TIMESTAMP,

                data_prevista_devolucao DATETIME,
                data_devolucao DATETIME,

                FOREIGN KEY (user_id)
                    REFERENCES users(id) ON DELETE RESTRICT,

                FOREIGN KEY (book_id)
                    REFERENCES books(id) ON DELETE RESTRICT
            );
        `);

        // Criar índices
        await db.exec(`
            CREATE INDEX IF NOT EXISTS idx_loans_user
            ON loans(user_id);

            CREATE INDEX IF NOT EXISTS idx_loans_book
            ON loans(book_id);

            CREATE INDEX IF NOT EXISTS idx_loans_status
            ON loans(status);

            CREATE INDEX IF NOT EXISTS idx_book_authors_author
            ON book_authors(author_id);
        `);

        // Integridade das chaves estrangeiras
        const foreignKeyErrors = await db.all(
            'PRAGMA foreign_key_check'
        );

        if (foreignKeyErrors.length > 0) {
            throw new Error(
                'Problemas nas chaves estrangeiras: ' +
                JSON.stringify(foreignKeyErrors)
            );
        }

        console.log('Banco de dados inicializado com sucesso!');

    } catch (error) {
        console.error('Erro ao inicializar o banco:', error);
        throw error;

    } finally {
        await db.close();
    }
}

async function importBook(term) {
    const db = await openDB();

    try {
        const books = await searchBooks(term);

        if (!books || books.length === 0) {
            throw new Error('Nenhum livro encontrado na API.');
        }

        const book = books[0];

        if (book.isbn) {
            const existingBook = await db.get(
                'SELECT * FROM books WHERE isbn = ?',
                [book.isbn]
            );

            if (existingBook) {
                return {
                    message: 'Este livro já está cadastrado.',
                    book: existingBook
                };
            }
        }

        const authors = Array.isArray(book.authors)
            ? book.authors
            : [];

        const authorNames = [
            ...new Set(
                authors
                    .map(name => String(name).trim())
                    .filter(Boolean)
            )
        ];

        await db.exec('BEGIN IMMEDIATE');

        try {
            const columns = [
                'isbn',
                'titulo',
                'thumbnail',
                'descricao',
                'editora'
            ];

            const values = [
                book.isbn || null,
                book.title || 'Sem título',
                book.thumbnail || null,
                book.description || 'Sem descrição',
                book.publisher || null
            ];

            if (await hasColumn(db, 'books', 'autor')) {
                columns.push('autor');
                values.push(authorNames.join(', '));
            }

            const placeholders = columns.map(() => '?').join(', ');

            const result = await db.run(
                `INSERT INTO books (${columns.join(', ')})
                 VALUES (${placeholders})`,
                values
            );

            // Cadastrar e relacionar os autores
            for (const name of authorNames) {
                await db.run(
                    `INSERT INTO authors (nome)
                     VALUES (?)
                     ON CONFLICT(nome) DO NOTHING`,
                    [name]
                );

                const author = await db.get(
                    `SELECT id
                     FROM authors
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
                    [result.lastID, author.id]
                );
            }

            const importedBook = await db.get(
                `SELECT
                    b.*,
                    GROUP_CONCAT(DISTINCT a.nome) AS autores
                 FROM books b
                 LEFT JOIN book_authors ba
                    ON ba.book_id = b.id
                 LEFT JOIN authors a
                    ON a.id = ba.author_id
                 WHERE b.id = ?
                 GROUP BY b.id`,
                [result.lastID]
            );

            await db.exec('COMMIT');

            return {
                message: 'Livro importado com sucesso!',
                book: importedBook
            };

        } catch (error) {
            await db.exec('ROLLBACK');
            throw error;
        }

    } finally {
        await db.close();
    }
}

module.exports = {
    dbPath,
    openDB,
    initializeDB,
    importBook
};