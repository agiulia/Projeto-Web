const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const bcrypt = require('bcrypt');

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

// Função para criar livro na tabela livros no banco
async function createBook(isbn = null, titulo, autor, thumbnail, descricao, editora, qtd_total = 1, qtd_disponivel = 1) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {

        await db.run(
            `INSERT INTO users (isbn, titulo, autor, thumbnail, descricao, editora, qtd_total, qtd_disponivel)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [isbn, titulo, autor, thumbnail, descricao, editora, qtd_total, qtd_disponivel]
        );

    } finally {
        await db.close();
    }
};

// Busca por usuário no banco de dados pelo nome
async function searchUserbyName(name) {
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

// Busca por usuário no banco de dados pelo e-mail
async function searchUserbyEmail(email) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });
    try {
        const user = await db.get(
            `SELECT * FROM users WHERE email = ?`,
            [email]
        );
        return user;
    } finally {
        await db.close();
    }
};

// Busca por livro no banco de dados pelo nome
async function searchBookbyName(nome) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });
    try {
        const user = await db.get(
            `SELECT * FROM books WHERE nome = ?`,
            [nome]
        );
        return user;
    } finally {
        await db.close();
    }
};

// Busca por livro no banco de dados pelo autor
async function searchBookbyAuthor(autor) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });
    try {
        const user = await db.get(
            `SELECT * FROM books WHERE autor = ?`,
            [autor]
        );
        return user;
    } finally {
        await db.close();
    }
};

// Busca por livro no banco de dados pela editora
async function searchBookbyEditor(editora) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });
    try {
        const user = await db.get(
            `SELECT * FROM books WHERE editora = ?`,
            [editora]
        );
        return user;
    } finally {
        await db.close();
    }
};

module.exports = {
    createUser,
    searchUserbyName,
    searchUserbyEmail,
    createBook,
    searchBookbyName,
    searchBookbyAuthor,
    searchBookbyEditor
};