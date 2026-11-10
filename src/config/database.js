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
            editora VARCHAR(100),
            qtd_total INT DEFAULT 1,
            qtd_disponivel DEFAULT 1,
            );
        `);
    } finally {
        await db.close();
    }
};

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
};

// Busca por usuário no banco de dados pelo nome
async function searchUser(name) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });
    try {
        const user = await db.get(
            `SELECT * FROM users WHERE name = ?`,
            [name]
        );
        return user;
    } finally {
        await db.close();
    }
};

// Função para criar tabela de estoque no banco
async function createStock() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });
};

// Função para criar tabela de empréstimos no banco
async function createLoan() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });
};

module.exports = {
    initializeDB,
    createUser,
};