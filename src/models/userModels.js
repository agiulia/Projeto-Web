
const bcrypt = require('bcrypt');

const {
    withDB,
    transaction
} = require('./auxiliarModels');

// Criar usuário
async function createUser(name, email, password, role = 'user') {
    return withDB(db => transaction(db, async () => {
        if (!name || !email || !password) {
            throw new Error(
                'Nome, e-mail e senha são obrigatórios.'
            );
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

        let status = 'aceito';

        // Verificar se já existe um administrador aprovado
        if (role === 'admin') {
            const existingAdmin = await db.get(
                `SELECT id FROM users
                 WHERE role = 'admin'
                 AND status = 'aceito'
                 LIMIT 1`
            );

            status = existingAdmin ? 'pendente' : 'aceito';
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await db.run(
            `INSERT INTO users (
                name,
                email,
                password,
                role,
                status
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                name.trim(),
                normalizedEmail,
                passwordHash,
                role,
                status
            ]
        );

        return db.get(
            `SELECT id, name, email, role, status,
                    admin_id, data_cadastro, data_aprovacao
             FROM users
             WHERE id = ?`,
            [result.lastID]
        );
    }));
}

// Aprovar cadastro de administrador
async function acceptAdmin(id, adminId) {
    return withDB(db => transaction(db, async () => {

        if (Number(id) === Number(adminId)) {
            throw new Error(
                'Você não pode aprovar sua própria solicitação.'
            );
        }

        // Verificar quem está aprovando
        const approver = await db.get(
            `SELECT id FROM users
             WHERE id = ?
             AND role = 'admin'
             AND status = 'aceito'`,
            [adminId]
        );

        if (!approver) {
            throw new Error(
                'Apenas administradores ativos podem aprovar solicitações.'
            );
        }

        const admin = await db.get(
            `SELECT id FROM users
             WHERE id = ?
             AND role = 'admin'
             AND status = 'pendente'`,
            [id]
        );

        if (!admin) {
            throw new Error(
                'Solicitação de administrador não encontrada ou já analisada.'
            );
        }

        const result = await db.run(
            `UPDATE users
             SET status = 'aceito',
                 admin_id = ?,
                 data_aprovacao = CURRENT_TIMESTAMP
             WHERE id = ?
             AND role = 'admin'
             AND status = 'pendente'`,
            [adminId, id]
        );

        if (!result.changes) {
            throw new Error('Não foi possível aprovar a solicitação.');
        }

        return {
            message: 'Administrador aprovado com sucesso!',
            admin: await db.get(
                `SELECT id, name, email, role, status,
                        admin_id, data_aprovacao
                 FROM users
                 WHERE id = ?`,
                [id]
            )
        };
    }));
}

// Recusar cadastro de administrador
async function rejectAdmin(id, adminId) {
    return withDB(db => transaction(db, async () => {

        if (Number(id) === Number(adminId)) {
            throw new Error(
                'Você não pode recusar sua própria solicitação.'
            );
        }

        const approver = await db.get(
            `SELECT id FROM users
             WHERE id = ?
             AND role = 'admin'
             AND status = 'aceito'`,
            [adminId]
        );

        if (!approver) {
            throw new Error(
                'Apenas administradores ativos podem recusar solicitações.'
            );
        }

        const admin = await db.get(
            `SELECT id FROM users
             WHERE id = ?
             AND role = 'admin'
             AND status = 'pendente'`,
            [id]
        );

        if (!admin) {
            throw new Error(
                'Solicitação de administrador não encontrada ou já analisada.'
            );
        }

        const result = await db.run(
            `UPDATE users
             SET status = 'recusado',
                 admin_id = ?,
                 data_aprovacao = CURRENT_TIMESTAMP
             WHERE id = ?
             AND role = 'admin'
             AND status = 'pendente'`,
            [adminId, id]
        );

        if (!result.changes) {
            throw new Error('Não foi possível recusar a solicitação.');
        }

        return {
            message: 'Cadastro de administrador recusado com sucesso!',
            admin: await db.get(
                `SELECT id, name, email, role, status,
                        admin_id, data_aprovacao
                 FROM users
                 WHERE id = ?`,
                [id]
            )
        };
    }));
}

// Buscar usuário pelo ID
async function searchUserbyId(id) {
    return withDB(db => db.get(
        `SELECT id, name, email, role, status,
                admin_id, data_cadastro, data_aprovacao
         FROM users
         WHERE id = ?`,
        [id]
    ));
}

// Buscar usuário pelo nome
async function searchUserbyName(name) {
    return withDB(db => db.all(
        `SELECT id, name, email, role, status
         FROM users
         WHERE name LIKE ?
         ORDER BY name`,
        [`%${name}%`]
    ));
}

// Buscar usuário pelo e-mail
async function searchUserbyEmail(email) {
    return withDB(db => db.get(
        `SELECT id, name, email, role, status
         FROM users
         WHERE email = ? COLLATE NOCASE`,
        [email.trim()]
    ));
}

// Atualizar nome e/ou e-mail
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
            throw new Error(
                'Nome e e-mail não podem ficar vazios.'
            );
        }

        if (newEmail.toLowerCase() !== user.email.toLowerCase()) {
            const emailExists = await db.get(
                `SELECT id FROM users
                 WHERE email = ? COLLATE NOCASE
                 AND id != ?`,
                [newEmail, id]
            );

            if (emailExists) {
                throw new Error(
                    'Este e-mail já está sendo utilizado.'
                );
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
    return withDB(db => transaction(db, async () => {

        if (!['user', 'admin'].includes(newRole)) {
            throw new Error('Nível de acesso inválido.');
        }

        const user = await db.get(
            'SELECT id, role FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        if (user.role === newRole) {
            return {
                message: 'O usuário já possui este nível de acesso.'
            };
        }

        if (newRole === 'admin') {
            await db.run(
                `UPDATE users
                 SET role = 'admin'
                 WHERE id = ?`,
                [id]
            );
        } else {
            await db.run(
                `UPDATE users
                 SET role = 'user',
                     status = 'aceito',
                     admin_id = NULL,
                     data_aprovacao = NULL
                 WHERE id = ?`,
                [id]
            );
        }

        return {
            message: 'Nível de acesso atualizado com sucesso!'
        };
    }));
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

// Retornar informações do usuário para login
async function searchUserForLogin(email) {
    return withDB(db => db.get(
        `SELECT id, name, email, role, status, password
         FROM users
         WHERE email = ? COLLATE NOCASE`,
        [email.trim()]
    ));
}

// Excluir usuário
async function deleteUser(id) {
    return withDB(db => transaction(db, async () => {
        const user = await db.get(
            'SELECT id, role FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        if (user.role === 'admin') {
            const activeAdmins = await db.get(
                `SELECT COUNT(*) AS total
                 FROM users
                 WHERE role = 'admin'
                 AND status = 'aceito'`
            );

            if (activeAdmins.total <= 1 && user.status === 'aceito') {
                throw new Error(
                    'Não é possível excluir o último administrador ativo.'
                );
            }
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

        // Limpar referências antes de excluir
        await db.run(
            `UPDATE users
             SET admin_id = NULL
             WHERE admin_id = ?`,
            [id]
        );

        await db.run(
            'DELETE FROM users WHERE id = ?',
            [id]
        );

        return {
            message: 'Usuário excluído com sucesso!'
        };
    }));
}

// Selecionar todos os usuários
async function getAllUsers() {
    return withDB(db => db.all(
        `SELECT id, name, email, role, status,
                admin_id, data_cadastro, data_aprovacao
         FROM users
         WHERE role = 'user'
         ORDER BY name`
    ));
}

// Buscar solicitações administrativas aceitas
async function getAcceptedAdmins() {
    return withDB(async (db) => {
        return db.all(`
            SELECT
                id,
                name,
                email,
                role,
                status,
                admin_id,
                data_cadastro,
                data_aprovacao
            FROM users
            WHERE role = 'admin'
              AND status = 'aceito'
            ORDER BY data_aprovacao DESC
        `);
    });
}

// Buscar solicitações administrativas pendentes
async function getPendingAdmins() {
    return withDB(db => db.all(
        `SELECT id, name, email, data_cadastro
         FROM users
         WHERE role = 'admin'
         AND status = 'pendente'
         ORDER BY data_cadastro`
    ));
}

// Buscar solicitações administrativas recusadas
async function getRejectedAdmins() {
    return withDB(async (db) => {
        return db.all(`
            SELECT
                id,
                name,
                email,
                role,
                status,
                admin_id,
                data_cadastro,
                data_aprovacao
            FROM users
            WHERE role = 'admin'
              AND status = 'recusado'
            ORDER BY data_aprovacao DESC
        `);
    });
}

// Buscar todos os administradores
async function getAllAdmins() {
    return withDB(async (db) => {
        return db.all(`
            SELECT
                id,
                name,
                email,
                role,
                status,
                admin_id,
                data_cadastro,
                data_aprovacao
            FROM users
            WHERE role = 'admin'
            ORDER BY data_cadastro DESC
        `);
    });
}

module.exports = {
    createUser,
    acceptAdmin,
    rejectAdmin,
    searchUserbyName,
    searchUserbyEmail,
    searchUserbyId,
    updateUser,
    updateRole,
    updatePassword,
    deleteUser,
    getAllUsers,
    getAcceptedAdmins,
    getPendingAdmins,
    getRejectedAdmins,
    getAllAdmins,
    searchUserForLogin
};