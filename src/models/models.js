
const { openDB } = require('../config/database');
const bcrypt = require('bcrypt');

// Criar usuário
async function createUser(name, email, password, role = 'user') {
    const db = await openDB();

    try {
        const existingUser = await db.get(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser) {
            throw new Error('Este e-mail já está cadastrado.');
        }

        if (!['user', 'admin'].includes(role)) {
            throw new Error('Nível de acesso inválido.');
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await db.run(
            `INSERT INTO users (name, email, password, role)
             VALUES (?, ?, ?, ?)`,
            [name, email, passwordHash, role]
        );

        return await db.get(
            'SELECT id, name, email, role FROM users WHERE id = ?',
            [result.lastID]
        );

    } finally {
        await db.close();
    }
}

// Buscar usuário pelo nome
async function searchUserbyName(name) {
    const db = await openDB();

    try {
        return await db.all(
            `SELECT id, name, email, role
             FROM users
             WHERE name LIKE ?`,
            [`%${name}%`]
        );

    } finally {
        await db.close();
    }
}

// Buscar usuário pelo e-mail
async function searchUserbyEmail(email) {
    const db = await openDB();

    try {
        return await db.get(
            `SELECT id, name, email, role
             FROM users
             WHERE email = ?`,
            [email]
        );

    } finally {
        await db.close();
    }
}

// Atualizar nome e/ou e-mail do usuário
async function updateUser(id, name, email) {
    const db = await openDB();

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

        return {
            message: 'Usuário atualizado com sucesso!'
        };

    } finally {
        await db.close();
    }
}

// Atualizar nível de acesso
async function updateRole(id, newRole) {
    const db = await openDB();

    try {
        const user = await db.get(
            'SELECT id FROM users WHERE id = ?',
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

        return {
            message: 'Nível de acesso atualizado com sucesso!'
        };

    } finally {
        await db.close();
    }
}

// Atualizar senha
async function updatePassword(id, currentPassword, newPassword) {
    const db = await openDB();

    try {
        const user = await db.get(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const passwordMatch = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!passwordMatch) {
            throw new Error('Senha atual incorreta.');
        }

        if (!newPassword || newPassword.length < 8) {
            throw new Error(
                'A nova senha deve ter pelo menos 8 caracteres.'
            );
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await db.run(
            `UPDATE users
             SET password = ?
             WHERE id = ?`,
            [passwordHash, id]
        );

        return {
            message: 'Senha atualizada com sucesso!'
        };

    } finally {
        await db.close();
    }
}

// Excluir usuário
async function deleteUser(id) {
    const db = await openDB();

    try {
        const user = await db.get(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const loans = await db.get(
            `SELECT COUNT(*) AS total
             FROM loans
             WHERE user_id = ?`,
            [id]
        );

        if (loans.total > 0) {
            throw new Error(
                'Não é possível excluir um usuário que possui histórico de empréstimos.'
            );
        }

        await db.run(
            'DELETE FROM users WHERE id = ?',
            [id]
        );

        return {
            message: 'Usuário excluído com sucesso!'
        };

    } finally {
        await db.close();
    }
}

// Selecionar todos os usuários
async function getAllUsers() {
    const db = await openDB();

    try {
        return await db.all(
            `SELECT id, name, email, role
             FROM users`
        );

    } finally {
        await db.close();
    }
}

// Criar livro
async function createBook(
    isbn,
    titulo,
    autor,
    thumbnail = null,
    descricao = null,
    editora = null,
    qtd_total = 1,
    qtd_disponivel = qtd_total
) {
    const db = await openDB();

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

        const result = await db.run(
            `INSERT INTO books
            (
                isbn,
                titulo,
                autor,
                thumbnail,
                descricao,
                editora,
                qtd_total,
                qtd_disponivel
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                isbn || null,
                titulo,
                autor,
                thumbnail,
                descricao,
                editora,
                qtd_total,
                qtd_disponivel
            ]
        );

        const book = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [result.lastID]
        );

        return {
            message: 'Livro cadastrado com sucesso!',
            book
        };

    } finally {
        await db.close();
    }
}

// Buscar livro pelo título
async function searchBookbyName(titulo) {
    const db = await openDB();

    try {
        return await db.all(
            `SELECT * FROM books
             WHERE titulo LIKE ?`,
            [`%${titulo}%`]
        );

    } finally {
        await db.close();
    }
}

// Buscar livro pelo autor
async function searchBookbyAuthor(autor) {
    const db = await openDB();

    try {
        return await db.all(
            `SELECT * FROM books
             WHERE autor LIKE ?`,
            [`%${autor}%`]
        );

    } finally {
        await db.close();
    }
}

// Buscar livro pela editora
async function searchBookbyEditor(editora) {
    const db = await openDB();

    try {
        return await db.all(
            `SELECT * FROM books
             WHERE editora LIKE ?`,
            [`%${editora}%`]
        );

    } finally {
        await db.close();
    }
}

// Atualizar informações do livro
async function updateBook(
    id,
    titulo,
    autor,
    editora,
    qtd_total,
    qtd_disponivel
) {
    const db = await openDB();

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

        if (
            !Number.isInteger(newQtdTotal) ||
            newQtdTotal < 0
        ) {
            throw new Error('Quantidade total inválida.');
        }

        if (
            !Number.isInteger(newQtdDisponivel) ||
            newQtdDisponivel < 0
        ) {
            throw new Error('Quantidade disponível inválida.');
        }

        if (newQtdDisponivel > newQtdTotal) {
            throw new Error(
                'A quantidade disponível não pode ser maior que a total.'
            );
        }

        const activeLoans = await db.get(
            `SELECT COUNT(*) AS total
             FROM loans
             WHERE book_id = ?
             AND status = 'aceito'`,
            [id]
        );

        if (newQtdTotal - newQtdDisponivel !== activeLoans.total) {
            throw new Error(
                'As quantidades devem considerar os empréstimos ativos.'
            );
        }

        await db.run(
            `UPDATE books
             SET titulo = ?,
                 autor = ?,
                 editora = ?,
                 qtd_total = ?,
                 qtd_disponivel = ?
             WHERE id = ?`,
            [
                newTitulo,
                newAutor,
                newEditora,
                newQtdTotal,
                newQtdDisponivel,
                id
            ]
        );

        return {
            message: 'Livro atualizado com sucesso!'
        };

    } finally {
        await db.close();
    }
}

// Excluir livro
async function deleteBook(id) {
    const db = await openDB();

    try {
        const book = await db.get(
            'SELECT id FROM books WHERE id = ?',
            [id]
        );

        if (!book) {
            throw new Error('Livro não encontrado.');
        }

        const loans = await db.get(
            `SELECT COUNT(*) AS total
             FROM loans
             WHERE book_id = ?`,
            [id]
        );

        if (loans.total > 0) {
            throw new Error(
                'Não é possível excluir um livro que possui histórico de empréstimos.'
            );
        }

        await db.run(
            'DELETE FROM books WHERE id = ?',
            [id]
        );

        return {
            message: 'Livro excluído com sucesso!'
        };

    } finally {
        await db.close();
    }
}

// Selecionar todos os livros
async function getAllBooks() {
    const db = await openDB();

    try {
        return await db.all(
            'SELECT * FROM books'
        );

    } finally {
        await db.close();
    }
}

// Criar empréstimo
async function createLoan(user_id, book_id, prazoDias = 7) {
    const db = await openDB();

    try {
        if (
            !Number.isInteger(prazoDias) ||
            prazoDias < 1 ||
            prazoDias > 30
        ) {
            throw new Error(
                'O prazo deve ser entre 1 e 30 dias.'
            );
        }

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

        const existingLoan = await db.get(
            `SELECT id FROM loans
             WHERE user_id = ?
             AND book_id = ?
             AND status IN ('pendente', 'aceito')`,
            [user_id, book_id]
        );

        if (existingLoan) {
            throw new Error(
                'Este usuário já possui um empréstimo ativo ou pendente deste livro.'
            );
        }

        const result = await db.run(
            `INSERT INTO loans
            (user_id, book_id, prazo_dias)
            VALUES (?, ?, ?)`,
            [user_id, book_id, prazoDias]
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
}

// Buscar empréstimos pelo ID do usuário
async function searchLoansByUser(user_id) {
    const db = await openDB();

    try {
        return await db.all(
            'SELECT * FROM loans WHERE user_id = ?',
            [user_id]
        );

    } finally {
        await db.close();
    }
}

// Buscar empréstimos pelo ID do livro
async function searchLoansByBook(book_id) {
    const db = await openDB();

    try {
        return await db.all(
            'SELECT * FROM loans WHERE book_id = ?',
            [book_id]
        );

    } finally {
        await db.close();
    }
}

// Aceitar empréstimo
async function acceptLoan(id) {
    const db = await openDB();
    let transaction = false;

    try {
        await db.run('BEGIN TRANSACTION');
        transaction = true;

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

        const book = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [loan.book_id]
        );

        if (!book || book.qtd_disponivel <= 0) {
            throw new Error('Não existem exemplares disponíveis.');
        }

        await db.run(
            `UPDATE loans
             SET status = 'aceito',
                 data_prevista_devolucao =
                    datetime('now', '+' || prazo_dias || ' days')
             WHERE id = ?`,
            [id]
        );

        await db.run(
            `UPDATE books
             SET qtd_disponivel = qtd_disponivel - 1
             WHERE id = ?`,
            [loan.book_id]
        );

        await db.run('COMMIT');
        transaction = false;

        const updatedLoan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        return {
            message: 'Empréstimo aprovado com sucesso!',
            loan: updatedLoan
        };

    } catch (error) {
        if (transaction) {
            await db.run('ROLLBACK');
        }

        throw error;

    } finally {
        await db.close();
    }
}

// Recusar empréstimo
async function rejectLoan(id) {
    const db = await openDB();

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
}

// Devolver livro
async function returnLoan(id) {
    const db = await openDB();
    let transaction = false;

    try {
        await db.run('BEGIN TRANSACTION');
        transaction = true;

        const loan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        if (!loan) {
            throw new Error('Empréstimo não encontrado.');
        }

        if (loan.status !== 'aceito') {
            throw new Error(
                'Este empréstimo não está ativo ou já foi devolvido.'
            );
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
        transaction = false;

        const updatedLoan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        return {
            message: 'Livro devolvido com sucesso!',
            loan: updatedLoan
        };

    } catch (error) {
        if (transaction) {
            await db.run('ROLLBACK');
        }

        throw error;

    } finally {
        await db.close();
    }
}

// Renovar empréstimo
async function updateLoan(id, diasAdicionais) {
    const db = await openDB();
    let transaction = false;

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
        transaction = true;

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

        const novoPrazo = loan.prazo_dias + diasAdicionais;

        if (novoPrazo > 30) {
            throw new Error(
                'O prazo total do empréstimo não pode ultrapassar 30 dias.'
            );
        }

        await db.run(
            `UPDATE loans
             SET data_prevista_devolucao =
                    datetime(data_prevista_devolucao, ?),
                 prazo_dias = ?
             WHERE id = ?`,
            [
                `+${diasAdicionais} days`,
                novoPrazo,
                id
            ]
        );

        await db.run('COMMIT');
        transaction = false;

        const updatedLoan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        return {
            message: `Empréstimo renovado por mais ${diasAdicionais} dias!`,
            loan: updatedLoan
        };

    } catch (error) {
        if (transaction) {
            await db.run('ROLLBACK');
        }

        throw error;

    } finally {
        await db.close();
    }
}

// Excluir empréstimo
async function deleteLoan(id) {
    const db = await openDB();
    let transaction = false;

    try {
        await db.run('BEGIN TRANSACTION');
        transaction = true;

        const loan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        if (!loan) {
            throw new Error('Empréstimo não encontrado.');
        }

        if (loan.status === 'aceito') {
            await db.run(
                `UPDATE books
                 SET qtd_disponivel = qtd_disponivel + 1
                 WHERE id = ?`,
                [loan.book_id]
            );
        }

        await db.run(
            'DELETE FROM loans WHERE id = ?',
            [id]
        );

        await db.run('COMMIT');
        transaction = false;

        return {
            message: 'Empréstimo excluído com sucesso!'
        };

    } catch (error) {
        if (transaction) {
            await db.run('ROLLBACK');
        }

        throw error;

    } finally {
        await db.close();
    }
}

// Selecionar todos os empréstimos
async function getAllLoans() {
    const db = await openDB();

    try {
        return await db.all(
            `SELECT
                id,
                user_id,
                book_id,
                status,
                prazo_dias,
                data_solicitacao,
                data_prevista_devolucao,
                data_devolucao
             FROM loans`
        );

    } finally {
        await db.close();
    }
}

module.exports = {
    createUser,
    searchUserbyName,
    searchUserbyEmail,
    updateUser,
    updateRole,
    updatePassword,
    deleteUser,
    getAllUsers,

    createBook,
    searchBookbyName,
    searchBookbyAuthor,
    searchBookbyEditor,
    updateBook,
    deleteBook,
    getAllBooks,

    createLoan,
    searchLoansByUser,
    searchLoansByBook,
    acceptLoan,
    rejectLoan,
    returnLoan,
    updateLoan,
    deleteLoan,
    getAllLoans
};