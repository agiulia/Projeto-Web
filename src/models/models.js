
const { openDB } = require('../config/database');
const bcrypt = require('bcrypt');

// Executar operações e fechar a conexão automaticamente
async function withDB(callback) {
    const db = await openDB();

    try {
        return await callback(db);
    } finally {
        await db.close();
    }
}

// Executar operações dentro de uma transação
async function transaction(db, callback) {
    await db.exec('BEGIN IMMEDIATE');

    try {
        const result = await callback();
        await db.exec('COMMIT');
        return result;
    } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
    }
}

// Normalizar os autores: aceita array ou string
function normalizeAuthors(authors) {
    if (!authors) return [];

    const list = Array.isArray(authors)
        ? authors
        : String(authors).split(',');

    const unique = new Map();

    for (const author of list) {
        const name = String(author).trim();

        if (name) {
            unique.set(name.toLocaleLowerCase('pt-BR'), name);
        }
    }

    return [...unique.values()];
}

// Associar autores a um livro
async function setBookAuthors(db, bookId, authors) {
    const authorNames = normalizeAuthors(authors);

    await db.run(
        'DELETE FROM book_authors WHERE book_id = ?',
        [bookId]
    );

    for (const name of authorNames) {
        await db.run(
            `INSERT INTO authors (nome)
             VALUES (?)
             ON CONFLICT(nome) DO NOTHING`,
            [name]
        );

        const author = await db.get(
            `SELECT id FROM authors
             WHERE nome = ? COLLATE NOCASE`,
            [name]
        );

        if (!author) {
            throw new Error(`Não foi possível cadastrar o autor: ${name}`);
        }

        await db.run(
            `INSERT OR IGNORE INTO book_authors
             (book_id, author_id)
             VALUES (?, ?)`,
            [bookId, author.id]
        );
    }
}

// Buscar livro com seus autores
async function getBookById(db, id) {
    return db.get(
        `SELECT
            b.*,
            GROUP_CONCAT(DISTINCT a.nome) AS autores
         FROM books b
         LEFT JOIN book_authors ba ON ba.book_id = b.id
         LEFT JOIN authors a ON a.id = ba.author_id
         WHERE b.id = ?
         GROUP BY b.id`,
        [id]
    );
}

// Criar usuário
async function createUser(name, email, password, role = 'user') {
    return withDB(async db => {
        if (!name || !email || !password) {
            throw new Error('Nome, e-mail e senha são obrigatórios.');
        }

        if (!['user', 'admin'].includes(role)) {
            throw new Error('Nível de acesso inválido.');
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await db.get(
            'SELECT id FROM users WHERE email = ? COLLATE NOCASE',
            [normalizedEmail]
        );

        if (existingUser) {
            throw new Error('Este e-mail já está cadastrado.');
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await db.run(
            `INSERT INTO users (name, email, password, role)
             VALUES (?, ?, ?, ?)`,
            [name.trim(), normalizedEmail, passwordHash, role]
        );

        return db.get(
            'SELECT id, name, email, role FROM users WHERE id = ?',
            [result.lastID]
        );
    });
}

// Buscar usuário pelo nome
async function searchUserbyName(name) {
    return withDB(db => db.all(
        `SELECT id, name, email, role
         FROM users
         WHERE name LIKE ?
         ORDER BY name`,
        [`%${name}%`]
    ));
}

// Buscar usuário pelo e-mail
async function searchUserbyEmail(email) {
    return withDB(db => db.get(
        `SELECT id, name, email, role
         FROM users
         WHERE email = ? COLLATE NOCASE`,
        [email.trim()]
    ));
}

// Atualizar nome e/ou e-mail do usuário
async function updateUser(id, name, email) {
    return withDB(async db => {
        const user = await db.get(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const newName = name ?? user.name;
        const newEmail = email
            ? email.trim().toLowerCase()
            : user.email;

        if (!newName || !newEmail) {
            throw new Error('Nome e e-mail não podem ficar vazios.');
        }

        if (newEmail.toLowerCase() !== user.email.toLowerCase()) {
            const emailExists = await db.get(
                `SELECT id FROM users
                 WHERE email = ? COLLATE NOCASE
                 AND id != ?`,
                [newEmail, id]
            );

            if (emailExists) {
                throw new Error('Este e-mail já está sendo utilizado.');
            }
        }

        await db.run(
            `UPDATE users
             SET name = ?, email = ?
             WHERE id = ?`,
            [newName.trim(), newEmail, id]
        );

        return {
            message: 'Usuário atualizado com sucesso!'
        };
    });
}

// Atualizar nível de acesso
async function updateRole(id, newRole) {
    return withDB(async db => {
        if (!['user', 'admin'].includes(newRole)) {
            throw new Error('Nível de acesso inválido.');
        }

        const result = await db.run(
            'UPDATE users SET role = ? WHERE id = ?',
            [newRole, id]
        );

        if (!result.changes) {
            throw new Error('Usuário não encontrado.');
        }

        return {
            message: 'Nível de acesso atualizado com sucesso!'
        };
    });
}

// Atualizar senha
async function updatePassword(id, currentPassword, newPassword) {
    return withDB(async db => {
        const user = await db.get(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        if (!newPassword || newPassword.length < 8) {
            throw new Error(
                'A nova senha deve ter pelo menos 8 caracteres.'
            );
        }

        const passwordMatch = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!passwordMatch) {
            throw new Error('Senha atual incorreta.');
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await db.run(
            'UPDATE users SET password = ? WHERE id = ?',
            [passwordHash, id]
        );

        return {
            message: 'Senha atualizada com sucesso!'
        };
    });
}

// Excluir usuário
async function deleteUser(id) {
    return withDB(async db => {
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
    });
}

// Selecionar todos os usuários
async function getAllUsers() {
    return withDB(db => db.all(
        `SELECT id, name, email, role
         FROM users
         ORDER BY name`
    ));
}

// Criar livro
async function createBook(
    isbn,
    titulo,
    autores = [],
    thumbnail = null,
    descricao = null,
    editora = null,
    qtd_total = 1,
    qtd_disponivel = qtd_total
) {
    return withDB(db => transaction(db, async () => {
        if (!titulo || !titulo.trim()) {
            throw new Error('O título do livro é obrigatório.');
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

        if (isbn) {
            const existingBook = await db.get(
                'SELECT * FROM books WHERE isbn = ?',
                [isbn]
            );

            if (existingBook) {
                return {
                    message: 'Este livro já está cadastrado.',
                    book: await getBookById(db, existingBook.id)
                };
            }
        }

        const result = await db.run(
            `INSERT INTO books (
                isbn,
                titulo,
                thumbnail,
                descricao,
                editora,
                qtd_total,
                qtd_disponivel
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                isbn || null,
                titulo.trim(),
                thumbnail,
                descricao,
                editora,
                qtd_total,
                qtd_disponivel
            ]
        );

        await setBookAuthors(db, result.lastID, autores);

        return {
            message: 'Livro cadastrado com sucesso!',
            book: await getBookById(db, result.lastID)
        };
    }));
}

// Buscar livro pelo título
async function searchBookbyName(titulo) {
    return withDB(db => db.all(
        `SELECT
            b.*,
            GROUP_CONCAT(DISTINCT a.nome) AS autores
         FROM books b
         LEFT JOIN book_authors ba ON ba.book_id = b.id
         LEFT JOIN authors a ON a.id = ba.author_id
         WHERE b.titulo LIKE ?
         GROUP BY b.id
         ORDER BY b.titulo`,
        [`%${titulo}%`]
    ));
}

// Buscar livro pelo autor
async function searchBookbyAuthor(autor) {
    return withDB(db => db.all(
        `SELECT
            b.*,
            GROUP_CONCAT(DISTINCT all_authors.nome) AS autores
         FROM books b
         INNER JOIN book_authors filter_ba
            ON filter_ba.book_id = b.id
         INNER JOIN authors filter_a
            ON filter_a.id = filter_ba.author_id
         LEFT JOIN book_authors all_ba
            ON all_ba.book_id = b.id
         LEFT JOIN authors all_authors
            ON all_authors.id = all_ba.author_id
         WHERE filter_a.nome LIKE ?
         GROUP BY b.id
         ORDER BY b.titulo`,
        [`%${autor}%`]
    ));
}

// Buscar livro pela editora
async function searchBookbyEditor(editora) {
    return withDB(db => db.all(
        `SELECT
            b.*,
            GROUP_CONCAT(DISTINCT a.nome) AS autores
         FROM books b
         LEFT JOIN book_authors ba ON ba.book_id = b.id
         LEFT JOIN authors a ON a.id = ba.author_id
         WHERE b.editora LIKE ?
         GROUP BY b.id
         ORDER BY b.titulo`,
        [`%${editora}%`]
    ));
}

// Atualizar informações do livro
async function updateBook(
    id,
    titulo,
    autores,
    editora,
    qtd_total,
    qtd_disponivel
) {
    return withDB(db => transaction(db, async () => {
        const book = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [id]
        );

        if (!book) {
            throw new Error('Livro não encontrado.');
        }

        const newTitulo = titulo ?? book.titulo;
        const newEditora = editora ?? book.editora;
        const newQtdTotal = qtd_total ?? book.qtd_total;
        const newQtdDisponivel =
            qtd_disponivel ?? book.qtd_disponivel;

        if (!newTitulo || !newTitulo.trim()) {
            throw new Error('O título do livro é obrigatório.');
        }

        if (
            !Number.isInteger(newQtdTotal) ||
            !Number.isInteger(newQtdDisponivel) ||
            newQtdTotal < 0 ||
            newQtdDisponivel < 0 ||
            newQtdDisponivel > newQtdTotal
        ) {
            throw new Error('Quantidades de livros inválidas.');
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
                 editora = ?,
                 qtd_total = ?,
                 qtd_disponivel = ?
             WHERE id = ?`,
            [
                newTitulo.trim(),
                newEditora,
                newQtdTotal,
                newQtdDisponivel,
                id
            ]
        );

        if (autores !== undefined && autores !== null) {
            await setBookAuthors(db, id, autores);
        }

        return {
            message: 'Livro atualizado com sucesso!',
            book: await getBookById(db, id)
        };
    }));
}

// Excluir livro
async function deleteBook(id) {
    return withDB(db => transaction(db, async () => {
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
            'DELETE FROM book_authors WHERE book_id = ?',
            [id]
        );

        await db.run(
            'DELETE FROM books WHERE id = ?',
            [id]
        );

        return {
            message: 'Livro excluído com sucesso!'
        };
    }));
}

// Selecionar todos os livros
async function getAllBooks() {
    return withDB(db => db.all(
        `SELECT
            b.*,
            GROUP_CONCAT(DISTINCT a.nome) AS autores
         FROM books b
         LEFT JOIN book_authors ba ON ba.book_id = b.id
         LEFT JOIN authors a ON a.id = ba.author_id
         GROUP BY b.id
         ORDER BY b.titulo`
    ));
}

// Criar empréstimo
async function createLoan(user_id, book_id, prazoDias = 7) {
    return withDB(db => transaction(db, async () => {
        if (
            !Number.isInteger(prazoDias) ||
            prazoDias < 1 ||
            prazoDias > 30
        ) {
            throw new Error('O prazo deve ser entre 1 e 30 dias.');
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
            `INSERT INTO loans (
                user_id,
                book_id,
                prazo_dias
            )
            VALUES (?, ?, ?)`,
            [user_id, book_id, prazoDias]
        );

        return {
            message: 'Solicitação de empréstimo criada com sucesso!',
            loan: await db.get(
                'SELECT * FROM loans WHERE id = ?',
                [result.lastID]
            )
        };
    }));
}

// Buscar empréstimos pelo ID do usuário
async function searchLoansByUser(user_id) {
    return withDB(db => db.all(
        `SELECT
            l.*,
            u.name AS user_name,
            b.titulo AS book_title
         FROM loans l
         INNER JOIN users u ON u.id = l.user_id
         INNER JOIN books b ON b.id = l.book_id
         WHERE l.user_id = ?
         ORDER BY l.data_solicitacao DESC`,
        [user_id]
    ));
}

// Buscar empréstimos pelo ID do livro
async function searchLoansByBook(book_id) {
    return withDB(db => db.all(
        `SELECT
            l.*,
            u.name AS user_name,
            b.titulo AS book_title
         FROM loans l
         INNER JOIN users u ON u.id = l.user_id
         INNER JOIN books b ON b.id = l.book_id
         WHERE l.book_id = ?
         ORDER BY l.data_solicitacao DESC`,
        [book_id]
    ));
}

// Aceitar empréstimo
async function acceptLoan(id) {
    return withDB(db => transaction(db, async () => {
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

        const updatedStock = await db.run(
            `UPDATE books
             SET qtd_disponivel = qtd_disponivel - 1
             WHERE id = ?
             AND qtd_disponivel > 0`,
            [loan.book_id]
        );

        if (!updatedStock.changes) {
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

        return {
            message: 'Empréstimo aprovado com sucesso!',
            loan: await db.get(
                'SELECT * FROM loans WHERE id = ?',
                [id]
            )
        };
    }));
}

// Recusar empréstimo
async function rejectLoan(id) {
    return withDB(async db => {
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

        return {
            message: 'Empréstimo recusado com sucesso!',
            loan: await db.get(
                'SELECT * FROM loans WHERE id = ?',
                [id]
            )
        };
    });
}

// Devolver livro
async function returnLoan(id) {
    return withDB(db => transaction(db, async () => {
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

        const updatedStock = await db.run(
            `UPDATE books
             SET qtd_disponivel = qtd_disponivel + 1
             WHERE id = ?
             AND qtd_disponivel < qtd_total`,
            [loan.book_id]
        );

        if (!updatedStock.changes) {
            throw new Error('Não foi possível atualizar o estoque.');
        }

        await db.run(
            `UPDATE loans
             SET status = 'devolvido',
                 data_devolucao = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [id]
        );

        return {
            message: 'Livro devolvido com sucesso!',
            loan: await db.get(
                'SELECT * FROM loans WHERE id = ?',
                [id]
            )
        };
    }));
}

// Renovar empréstimo
async function updateLoan(id, diasAdicionais) {
    return withDB(db => transaction(db, async () => {
        if (
            !Number.isInteger(diasAdicionais) ||
            diasAdicionais < 1 ||
            diasAdicionais > 15
        ) {
            throw new Error(
                'A renovação deve ser entre 1 e 15 dias.'
            );
        }

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

        return {
            message: `Empréstimo renovado por mais ${diasAdicionais} dias!`,
            loan: await db.get(
                'SELECT * FROM loans WHERE id = ?',
                [id]
            )
        };
    }));
}

// Excluir empréstimo
async function deleteLoan(id) {
    return withDB(db => transaction(db, async () => {
        const loan = await db.get(
            'SELECT * FROM loans WHERE id = ?',
            [id]
        );

        if (!loan) {
            throw new Error('Empréstimo não encontrado.');
        }

        if (loan.status === 'aceito') {
            const updatedStock = await db.run(
                `UPDATE books
                 SET qtd_disponivel = qtd_disponivel + 1
                 WHERE id = ?
                 AND qtd_disponivel < qtd_total`,
                [loan.book_id]
            );

            if (!updatedStock.changes) {
                throw new Error(
                    'Não foi possível atualizar o estoque ao excluir o empréstimo.'
                );
            }
        }

        await db.run(
            'DELETE FROM loans WHERE id = ?',
            [id]
        );

        return {
            message: 'Empréstimo excluído com sucesso!'
        };
    }));
}

// Selecionar todos os empréstimos
async function getAllLoans() {
    return withDB(db => db.all(
        `SELECT
            l.*,
            u.name AS user_name,
            b.titulo AS book_title
         FROM loans l
         INNER JOIN users u ON u.id = l.user_id
         INNER JOIN books b ON b.id = l.book_id
         ORDER BY l.data_solicitacao DESC`
    ));
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