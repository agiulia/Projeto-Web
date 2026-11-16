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

// Atualizar informações nome e/ou e-mail do usuário no banco de dados
async function updateUser(id, name, email) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const user = await db.get(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const newName = name ?? user.name;
        const newEmail = email ?? user.email;

        if (newEmail !== user.email) {
            const emailExists = await db.get(
                'SELECT id FROM users WHERE email = ?',
                [newEmail]
            );

            if (emailExists) {
                throw new Error('Este e-mail já está sendo utilizado.');
            }
        }

        await db.run(
            `UPDATE users
             SET name = ?, email = ?
             WHERE id = ?`,
            [newName, newEmail, id]
        );

        console.log('Usuário atualizado!');

    } finally {
        await db.close();
    }
};

// Atualizar nível de acesso do usuário no banco de dados
async function updateRole(id, newRole) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const user = await db.get(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        if (!['user', 'admin'].includes(newRole)) {
            throw new Error('Nível de acesso inválido.');
        }

        await db.run(
            `UPDATE users
             SET role = ?
             WHERE id = ?`,
            [newRole, id]
        );

    } finally {
        await db.close();
    }
};

// Atualizar senha do usuário no banco de dados
async function updatePassword(id, currentPassword, newPassword) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const user = await db.get(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        // Verifica se a senha nova é a mesma da anterior
        const passwordMatch = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!passwordMatch) {
            throw new Error('Senha atual incorreta.');
        }

        // Criptografia da nova senha
        const passwordHash = await bcrypt.hash(newPassword, 10);

        await db.run(
            `UPDATE users
             SET password = ?
             WHERE id = ?`,
            [passwordHash, id]
        );

    } finally {
        await db.close();
    }
};

// Atualizar informações do livro no banco de dados
async function updateBook(id, titulo, autor, editora, qtd_total, qtd_disponivel) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const book = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [id]
        );

        if (!book) {
            throw new Error('Livro não encontrado.');
        }

        const newTitulo = titulo ?? book.titulo;
        const newAutor = autor ?? book.autor;
        const newEditora = editora ?? book.editora;
        const newQtdTotal = qtd_total ?? book.qtd_total;
        const newQtdDisponivel = qtd_disponivel ?? book.qtd_disponivel;

        await db.run(
            `UPDATE books
             SET titulo = ?, autor = ?, editora = ?, qtd_total = ?, qtd_disponivel = ?
             WHERE id = ?`,
            [newTitulo, newAutor, newEditora, newQtdTotal, newQtdDisponivel, id]
        );

    } finally {
        await db.close();
    }
};

// Deletar usuário do banco de dados
async function deleteUser(id) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const user = await db.get(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        await db.run(
            `DELETE FROM users
             WHERE id = ?`,
            [id]
        );

    } finally {
        await db.close();
    }
};

// Deletar livro do banco de dados
async function deleteBook(id) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const book = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [id]
        );

        if (!book) {
            throw new Error('Livro não encontrado.');
        }

        await db.run(
            `DELETE FROM books
             WHERE id = ?`,
            [id]
        );

    } finally {
        await db.close();
    }
};

// Selecionar todos os usuários do banco de dados
async function getAllUsers() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const users = await db.all(
            `SELECT id, name, email, role
             FROM users`
        );

        return users;

    } finally {
        await db.close();
    }
};

// Selecionar todos os livros do banco de dados
async function getAllBooks() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const books = await db.all(
            `SELECT id, name, email, role
             FROM books`
        );

        return books;

    } finally {
        await db.close();
    }
}

module.exports = {
    createUser,
    searchUserbyName,
    searchUserbyEmail,
    createBook,
    searchBookbyName,
    searchBookbyAuthor,
    searchBookbyEditor,
    updateUser,
    updateRole,
    updatePassword,
    updateBook,
    deleteUser,
    deleteBook,
    getAllUsers,
    getAllBooks
};