
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// Importe searchBooks do arquivo onde está implementada a API.
const { searchBooks } = require('../services/googleBooks');

const dbPath = path.join(__dirname, 'banco.db');

// Abrir conexão com o banco
async function openDB() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    await db.exec('PRAGMA foreign_keys = ON');

    return db;
}

// Inicializar banco de dados
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
                titulo VARCHAR(225),
                autor VARCHAR(225),
                thumbnail TEXT,
                descricao TEXT,
                editora VARCHAR(100),
                qtd_total INTEGER NOT NULL DEFAULT 1,
                qtd_disponivel INTEGER NOT NULL DEFAULT 1
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

                data_solicitacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                data_prevista_devolucao DATETIME,
                data_devolucao DATETIME,

                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (book_id) REFERENCES books(id)
            );
        `);
    } finally {
        await db.close();
    }
}

// Importar um livro da API
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

        const result = await db.run(
            `INSERT INTO books
            (
                isbn,
                titulo,
                autor,
                thumbnail,
                descricao,
                editora
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                book.isbn || null,
                book.title || 'Sem título',
                book.authors?.join(', ') || 'Autor desconhecido',
                book.thumbnail || null,
                book.description || 'Sem descrição',
                book.publisher || null
            ]
        );

        const importedBook = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [result.lastID]
        );

        return {
            message: 'Livro importado com sucesso!',
            book: importedBook
        };

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