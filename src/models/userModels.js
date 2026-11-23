const bcrypt = require('bcrypt');
const { withDB } = require('./auxiliarModels');

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

// Buscar usuário pelo ID
async function searchUserbyId(id) {
    return withDB(db => db.get(
        `SELECT id, name, email, role
         FROM users
         WHERE id = ?`,
        [id]
    ));
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

// Retornar informações do usuário
async function searchUserForLogin(email) {
    return withDB(db => db.get(
        `SELECT id, name, email, role, password
         FROM users
         WHERE email = ? COLLATE NOCASE`,
        [email.trim()]
    ));
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

module.exports = {
    createUser,
    searchUserbyName,
    searchUserbyEmail,
    searchUserbyId,
    updateUser,
    updateRole,
    updatePassword,
    deleteUser,
    getAllUsers,
    searchUserForLogin
};