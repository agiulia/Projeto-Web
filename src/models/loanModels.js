const {
    withDB,
    transaction
} = require('./auxiliarModels');

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

// Selecionar informações relacionadas à empréstimos

// Consulta cruzada: empréstimos + usuário + livro + autores
// filters aceita: id, user_id, book_id, status

async function getLoansDetailed(filters = {}) {
    return withDB(db => {
        const where = [];
        const params = [];

        if (filters.id !== undefined &&
            filters.id !== null &&
            filters.id !== '') {

            where.push('l.id = ?');
            params.push(filters.id);
        }

        if (filters.user_id !== undefined &&
            filters.user_id !== null &&
            filters.user_id !== '') {

            where.push('l.user_id = ?');
            params.push(filters.user_id);
        }

        if (filters.book_id !== undefined &&
            filters.book_id !== null &&
            filters.book_id !== '') {

            where.push('l.book_id = ?');
            params.push(filters.book_id);
        }

        if (filters.status !== undefined &&
            filters.status !== null &&
            filters.status !== '') {

            where.push('l.status = ?');
            params.push(filters.status);
        }

        const whereSQL = where.length
            ? `WHERE ${where.join(' AND ')}`
            : '';

        return db.all(
            `SELECT
                l.id,
                l.status,
                l.prazo_dias,
                l.data_solicitacao,
                l.data_prevista_devolucao,
                l.data_devolucao,

                u.id AS user_id,
                u.name AS user_name,
                u.email AS user_email,

                b.id AS book_id,
                b.titulo AS book_title,
                b.isbn,

                GROUP_CONCAT(DISTINCT a.nome) AS autores

             FROM loans l

             INNER JOIN users u
                ON u.id = l.user_id

             INNER JOIN books b
                ON b.id = l.book_id

             LEFT JOIN book_authors ba
                ON ba.book_id = b.id

             LEFT JOIN authors a
                ON a.id = ba.author_id

             ${whereSQL}

             GROUP BY l.id

             ORDER BY l.data_solicitacao DESC`,

            params
        );
    });
}

module.exports = {
    createLoan,
    searchLoansByUser,
    searchLoansByBook,
    acceptLoan,
    rejectLoan,
    returnLoan,
    updateLoan,
    deleteLoan,
    getAllLoans,
    getLoansDetailed
};