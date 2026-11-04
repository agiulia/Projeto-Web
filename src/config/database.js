import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const bcrypt = require('bcrypt');

// Função para criar usuário comum na tabela usuários no banco
async function createUser(name, email, password) {
    const db = await open({
        filename: './banco.db',
        driver: sqlite3.Database,
    });

    try {
        await db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'admin'))
        )`);

        // Criptografia da senha
        const passwordHash = await bcrypt.hash(password, 10);

        await db.run(
            `INSERT INTO users (name, email, password, role)
             VALUES (?, ?, ?, ?)`,
            [name, email, passwordHash, role]);
    } finally {
    await db.close();
    }
}

// Função para criar usuário admin na tabela usuários no banco
async function createAdmin(name, email, password) {
    const db = await open({
        filename: './banco.db',
        driver: sqlite3.Database,
    });

    try {
        await db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'admin'))
        )`);
        
        // Criptografia da senha
        const passwordHash = await bcrypt.hash(password, 10);

        await db.run(
            `INSERT INTO users (name, email, password, role)
             VALUES (?, ?, ?, ?)`,
            [name, email, passwordHash, 'admin']
        );
    } finally {
    await db.close();
    }
}

// Função para criar tabela de estoque no banco
async function createStock() {
    const db = await open({
        filename: './banco.db',
        driver: sqlite3.Database,
    });
}

// Função para criar tabela de empréstimos no banco
async function createLoan() {
    const db = await open({
        filename: './banco.db',
        driver: sqlite3.Database,
    });
}

module.exports = {
    createUser,
    createAdmin,
};