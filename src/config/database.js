import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const bcrypt = require('bcrypt');

// Função para criar usuários na tabela usuários no banco
async function createUser(name, email, password) {
    const db = await open({
        filename: './banco.db',
        driver: sqlite3.Database,
    });

    await db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`);

    // Criptografia da senha
    const passwordHash = await bcrypt.hash(password, 10);

    await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, passwordHash]);

    await db.close();
}

module.exports = {
    createUser,
};