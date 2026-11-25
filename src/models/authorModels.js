const { openDB } = require('../config/database');

// Atualizar nome do autor
async function updateAuthor(id, nome) {
    if (!id || !nome || !nome.trim()) {
        throw new Error('ID e nome do autor são obrigatórios.');
    }

    return withDB(async (db) => {
        const author = await db.get(
            'SELECT id FROM authors WHERE id = ?',
            [id]
        );

        if (!author) {
            throw new Error('Autor não encontrado.');
        }

        await db.run(
            'UPDATE authors SET nome = ? WHERE id = ?',
            [nome.trim(), id]
        );

        return db.get(
            'SELECT id, nome FROM authors WHERE id = ?',
            [id]
        );
    });
}

// Excluir autor e livros relacionados exclusivamente a ele
async function deleteAuthor(id) {
    if (!id) {
        throw new Error('ID do autor é obrigatório.');
    }

    return withDB(async (db) => {
        await db.exec('BEGIN IMMEDIATE');

        try {
            const author = await db.get(
                'SELECT id FROM authors WHERE id = ?',
                [id]
            );

            if (!author) {
                throw new Error('Autor não encontrado.');
            }

            const books = await db.all(`
                SELECT b.id
                FROM books b
                INNER JOIN book_authors ba
                    ON ba.book_id = b.id
                WHERE ba.author_id = ?
            `, [id]);

            await db.run(`
                DELETE FROM book_authors
                WHERE author_id = ?
            `, [id]);

            for (const book of books) {
                await db.run(`
                    DELETE FROM book_authors
                    WHERE book_id = ?
                `, [book.id]);

                await db.run(`
                    DELETE FROM books
                    WHERE id = ?
                `, [book.id]);
            }

            await db.run(
                'DELETE FROM authors WHERE id = ?',
                [id]
            );

            await db.exec('COMMIT');

            return {
                message: 'Autor e livros associados excluídos com sucesso.',
                deletedBooks: books.length
            };

        } catch (error) {
            await db.exec('ROLLBACK');
            throw error;
        }
    });
}

// Buscar autor pelo ID
async function searchAuthorbyId(id) {
    return withDB(db => db.get(
        `SELECT name
         FROM authors
         WHERE id = ?`,
        [id]
    ));
}

// Listar todos os autores
async function getAllAuthors() {
    return withDB(async (db) => {
        return db.all(`
            SELECT
                id,
                nome
            FROM authors
            ORDER BY nome ASC
        `);
    });
}

module.exports = {
    updateAuthor,
    deleteAuthor,
    searchAuthorbyId,
    getAllAuthors
};