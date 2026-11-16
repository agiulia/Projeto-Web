const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const path = require('path');
const dbPath = path.join(__dirname, 'banco.db');

// Iniciar banco de dados
async function initializeDB() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(50) NOT NULL,
                email VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(50) NOT NULL,
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
                qtd_total INT DEFAULT 1,
                qtd_disponivel INT DEFAULT 1
            );
        `);
    } finally {
        await db.close();
    }
};

async function importBooks(term) {
    const db = await open({
        filename: './banco.db',
        driver: sqlite3.Database,
    });

    try {
        const books = await searchBooks(term);

            for (const book of books) {
                await db.run(
                    `INSERT OR IGNORE INTO books
                    (isbn, titulo, autor, thumbnail, descricao, editora)
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
            }
        } finally {
        await db.close();
    }
}

module.exports = {
    initializeDB,
    importBooks
};