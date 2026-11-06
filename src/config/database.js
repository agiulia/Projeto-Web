const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const bcrypt = require('bcrypt');

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
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user', 'admin'))
            )
        `);
    } finally {
        await db.close();
    }
}

// Função para criar usuário na tabela usuários no banco
async function createUser(name, email, password, role = 'user') {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        // Criptografia da senha
        const passwordHash = await bcrypt.hash(password, 12);

        await db.run(
            `INSERT INTO users (name, email, password, role)
             VALUES (?, ?, ?, ?)`,
            [name, email, passwordHash, role]
        );

    } finally {
        await db.close();
    }
}

// Função para criar tabela de estoque no banco
async function createStock() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });
}

// Função para criar tabela de empréstimos no banco
async function createLoan() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });
}

module.exports = {
    initializeDB,
    createUser,
};