//const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');

const { dbPath } = require('../config/database');
const { search } = require('../app');

// Função para criar usuário na tabela usuários no banco
async function createUser(name, email, password, role = 'user') {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const existingUser = await db.get(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser) {
            throw new Error('Este e-mail já está cadastrado.');
        }

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
        if (isbn) {
            const existingBook = await db.get(
                'SELECT * FROM books WHERE isbn = ?',
                [isbn]
            );

            if (existingBook) {
                return {
                    message: 'Este livro já está cadastrado.',
                    book: existingBook
                };
            }
        }

        if (
            !Number.isInteger(qtd_total) ||
            !Number.isInteger(qtd_disponivel) ||
            qtd_total < 0 ||
            qtd_disponivel < 0 ||
            qtd_disponivel > qtd_total
        ) {
            throw new Error('Quantidades de livros inválidas.');
        }

        await db.run(
            `INSERT INTO users (isbn, titulo, autor, thumbnail, descricao, editora, qtd_total, qtd_disponivel)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [isbn, titulo, autor, thumbnail, descricao, editora, qtd_total, qtd_disponivel]
        );

    } finally {
        await db.close();
    }
};

// Função para criar empréstimo na tabela empréstimos no banco
async function createLoan(user_id, book_id, prazoDias = 7) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const user = await db.get(
            'SELECT id FROM users WHERE id = ?',
            [user_id]
        );

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const book = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [book_id]
        );

        if (!book) {
            throw new Error('Livro não encontrado.');
        }

        if (book.qtd_disponivel <= 0) {
            throw new Error('Não existem exemplares disponíveis.');
        }

        if (!Number.isInteger(prazoDias) || prazoDias <= 0) {
            throw new Error('Prazo de empréstimo inválido.');
        }

        const existingLoan = await db.get(
            `SELECT id FROM loans
             WHERE user_id = ?
             AND book_id = ?
             AND status IN ('pendente', 'aceito')`,
            [user_id, book_id]
        );

        if (existingLoan) {
            throw new Error('Este usuário já possui um empréstimo ativo ou pendente deste livro.');
        }

        const result = await db.run(
            `INSERT INTO loans
            (user_id, book_id, status, data_prevista_devolucao)
            VALUES (?, ?, 'pendente', datetime('now', ?))`,
            [user_id, book_id, `+${prazoDias} days`]
        );

        const loan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [result.lastID]
        );

        return {
            message: 'Solicitação de empréstimo criada com sucesso!',
            loan
        };

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
        const user = await db.all(
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
        const user = await db.all(
            `SELECT * FROM books WHERE editora = ?`,
            [editora]
        );
        return user;
    } finally {
        await db.close();
    }
};

// Busca por empréstimos no banco de dados pelo ID do usuário
async function searchLoansByUser(user_id) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const loans = await db.all(
            'SELECT * FROM loans WHERE user_id = ?',
            [user_id]
        );

        return loans;

    } finally {
        await db.close();
    }
};

// Busca por empréstimos no banco de dados pelo ID do livro
async function searchLoansByBook(book_id) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const loans = await db.all(
            'SELECT * FROM loans WHERE book_id = ?',
            [book_id]
        );

        return loans;

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

        if (!Number.isInteger(newQtdTotal) || newQtdTotal < 0) {
            throw new Error('Quantidade total inválida.');
        }
        
        if (!Number.isInteger(newQtdDisponivel) || newQtdDisponivel < 0) {
            throw new Error('Quantidade disponível inválida.');
        }
        
        if (newQtdDisponivel > newQtdTotal) {
            throw new Error('A quantidade disponível não pode ser maior que a total.');
        }

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

// Função para aceitar empréstimo na tabela empréstimos no banco
async function acceptLoan(id, prazoDias = 7) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        if (!Number.isInteger(prazoDias) || prazoDias <= 0) {
            throw new Error('Prazo de empréstimo inválido.');
        }

        const loan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        if (!loan) {
            throw new Error('Empréstimo não encontrado.');
        }

        if (loan.status !== 'pendente') {
            throw new Error('Este empréstimo não está pendente.');
        }

        await db.run('BEGIN TRANSACTION');

        const book = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [loan.book_id]
        );

        if (!book || book.qtd_disponivel <= 0) {
            throw new Error('Não existem exemplares disponíveis.');
        }

        const resultDate = await db.get(
            `SELECT datetime('now', ?) AS data`,
            [`+${prazoDias} days`]
        );

        await db.run(
            `UPDATE loans
             SET status = 'aceito',
                 data_prevista_devolucao = ?
             WHERE id = ?`,
            [resultDate.data, id]
        );

        await db.run(
            `UPDATE books
             SET qtd_disponivel = qtd_disponivel - 1
             WHERE id = ?`,
            [loan.book_id]
        );

        await db.run('COMMIT');

        const updatedLoan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        return {
            message: 'Empréstimo aprovado com sucesso!',
            loan: updatedLoan
        };

    } catch (error) {
        await db.run('ROLLBACK');
        throw error;

    } finally {
        await db.close();
    }
};

// Função para recusar empréstimo na tabela empréstimos no banco
async function rejectLoan(id) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const loan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        if (!loan) {
            throw new Error('Empréstimo não encontrado.');
        }

        if (loan.status !== 'pendente') {
            throw new Error('Este empréstimo não está pendente.');
        }

        await db.run(
            `UPDATE loans
             SET status = 'recusado'
             WHERE id = ?`,
            [id]
        );

        const updatedLoan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        return {
            message: 'Empréstimo recusado com sucesso!',
            loan: updatedLoan
        };

    } finally {
        await db.close();
    }
};

// Função para devolver livro na tabela empréstimos no banco
async function returnLoan(id) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        await db.run('BEGIN TRANSACTION');

        const loan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        if (!loan) {
            throw new Error('Empréstimo não encontrado.');
        }

        if (loan.status !== 'aceito') {
            throw new Error('Este empréstimo não está ativo ou já foi devolvido.');
        }

        const book = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [loan.book_id]
        );

        if (!book) {
            throw new Error('Livro não encontrado.');
        }

        await db.run(
            `UPDATE loans
             SET status = 'devolvido',
                 data_devolucao = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [id]
        );

        await db.run(
            `UPDATE books
             SET qtd_disponivel = qtd_disponivel + 1
             WHERE id = ?`,
            [loan.book_id]
        );

        await db.run('COMMIT');

        const updatedLoan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        return {
            message: 'Livro devolvido com sucesso!',
            loan: updatedLoan
        };

    } catch (error) {
        await db.run('ROLLBACK');
        throw error;

    } finally {
        await db.close();
    }
};

// Função para estender o prazo do empréstimo no banco de dados
async function updateLoan(id, diasAdicionais) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        if (
            !Number.isInteger(diasAdicionais) ||
            diasAdicionais < 1 ||
            diasAdicionais > 15
        ) {
            throw new Error(
                'A renovação deve ser entre 1 e 15 dias.'
            );
        }

        await db.run('BEGIN TRANSACTION');

        const loan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        if (!loan) {
            throw new Error('Empréstimo não encontrado.');
        }

        if (loan.status !== 'aceito') {
            throw new Error(
                'Somente empréstimos aceitos podem ser renovados.'
            );
        }

        if (!loan.data_prevista_devolucao) {
            throw new Error(
                'Data prevista de devolução não encontrada.'
            );
        }

        await db.run(
            `UPDATE loans
             SET data_prevista_devolucao =
                 datetime(data_prevista_devolucao, ?),
                 prazo_dias = prazo_dias + ?
             WHERE id = ?`,
            [`+${diasAdicionais} days`, diasAdicionais, id]
        );

        await db.run('COMMIT');

        const updatedLoan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        return {
            message: `Empréstimo renovado por mais ${diasAdicionais} dias!`,
            loan: updatedLoan
        };

    } catch (error) {
        await db.run('ROLLBACK');
        throw error;

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

// Deletar empréstimo do banco de dados
async function deleteLoan(id) {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const loan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        if (!book) {
            throw new Error('Empréstimo não encontrado.');
        }

        await db.run(
            `DELETE FROM loans
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
};

// Selecionar todos os empréstimos do banco de dados
async function getAllLoans() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    try {
        const loans = await db.all(
            `SELECT id, user_id, book_id, status, data_solicitacao, data_devolucao
             FROM loans`
        );

        return loans;

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
    searchBookbyEditor,
    searchLoansByUser,
    searchLoansByBook,
    updateUser,
    updateRole,
    updatePassword,
    updateBook,
    updateLoan,
    deleteUser,
    deleteBook,
    deleteLoan,
    getAllUsers,
    getAllBooks,
    getAllLoans
};