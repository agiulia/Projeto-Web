const {
    createUser,
    searchUserForLogin,
    searchUserbyId,
    searchUserbyName,
    getAllUsers,
    updateUser,
    updateRole,
    updatePassword,
    deleteUser,
} = require('../models/models');
const bcrypt = require('bcrypt');

// Mostra o formulário de cadastro
function showRegisterForm(req, res) {
    res.render('usuarios/cadastro', { error: null });
}

// Recebe o formulário e cria o usuário
async function register(req, res) {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).render('usuarios/cadastro', {
            error: 'Preencha todos os campos.',
        });
    }

    try {
        await createUser(name, email, password);
        res.redirect('/usuarios/login');
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).render('usuarios/cadastro', {
                error: 'Este e-mail já está cadastrado.',
            });
        }

        console.error(err);
        res.status(500).render('usuarios/cadastro', {
            error: 'Erro ao criar o usuário. Tente novamente.',
        });
    }
}

// Mostra o formulário de login
function showLoginForm(req, res) {
    res.render('usuarios/login', { error: null });
}

// Confere e-mail e senha e guarda o usuário na sessão
async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).render('usuarios/login', {
            error: 'Preencha todos os campos.',
        });
    }

    try {
        const user = await searchUserForLogin(email);
        const passwordOk = user && await bcrypt.compare(password, user.password);

        if (!passwordOk) {
            return res.status(401).render('usuarios/login', {
                error: 'E-mail ou senha incorretos.',
            });
        }

        // guarda na sessão (sem a senha)
        req.session.usuario = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };

        res.redirect(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
        console.error(err);
        res.status(500).render('usuarios/login', {
            error: 'Erro ao fazer login. Tente novamente.',
        });
    }
}

// Encerra a sessão
function logout(req, res) {
    req.session.destroy(() => {
        res.redirect('/usuarios/login');
    });
}

// ---------- CRUD DE USUÁRIOS ----------

function handleError(res, err) {
    console.error(err);

    if (err.code && String(err.code).startsWith('SQLITE')) {
        return res.status(500).json({ error: 'Erro no banco de dados.' });
    }

    const status = err.message.includes('não encontrado') ? 404 : 400;
    res.status(status).json({ error: err.message });
}

// ADM pode tudo, usuario comum so mexe no proprio perfil
function canAccess(req, id) {
    const logged = req.session.usuario;
    return logged.role === 'admin' || logged.id === id;
}

// GET /usuarios
async function listUsers(req, res) {
    try {
        const { name } = req.query;
        const users = name
            ? await searchUserbyName(name) // lista so um
            : await getAllUsers(); // senao lista todox

        res.json(users);
    } catch (err) {
        handleError(res, err);
    }
}

// GET /usuarios/:id
async function showUser(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'ID inválido.' });
        }

        if (!canAccess(req, id)) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const user = await searchUserbyId(id);

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json(user);
    } catch (err) {
        handleError(res, err);
    }
}

// POST /usuarios serve para criar já definindo a role
async function addUser(req, res) {
    try {
        const { name, email, password, role } = req.body;
        const user = await createUser(name, email, password, role || 'user');

        res.status(201).json({
            message: 'Usuário criado com sucesso!',
            user
        });
    } catch (err) {
        handleError(res, err);
    }
}

// PUT /usuarios/:id  (nome e e-mail)
async function editUser(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'ID inválido.' });
        }

        if (!canAccess(req, id)) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const { name, email } = req.body;
        const result = await updateUser(id, name, email);

        // quando atualiza o proprio perfil atualiza os dados da sessao
        if (req.session.usuario.id === id) {
            req.session.usuario = await searchUserbyId(id);
        }

        res.json(result);
    } catch (err) {
        handleError(res, err);
    }
}

// PUT /usuarios/:id/role
async function changeRole(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'ID inválido.' });
        }

        const result = await updateRole(id, req.body.role);

        // quando atualiza o proprio perfil atualiza os dados da sessao
        if (req.session.usuario.id === id) {
            req.session.usuario.role = req.body.role;
        }

        res.json(result);
    } catch (err) {
        handleError(res, err);
    }
}

// PUT /usuarios/:id/senha
async function changePassword(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'ID inválido.' });
        }

        if (req.session.usuario.id !== id) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const { currentPassword, newPassword } = req.body;
        const result = await updatePassword(id, currentPassword, newPassword);

        res.json(result);
    } catch (err) {
        handleError(res, err);
    }
}

// DELETE /usuarios/:id
async function removeUser(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'ID inválido.' });
        }

        if (req.session.usuario.id === id) {
            return res.status(400).json({
                error: 'Você não pode excluir a própria conta.'
            });
        }

        const result = await deleteUser(id);
        res.json(result);
    } catch (err) {
        handleError(res, err);
    }
}

module.exports = {
    showRegisterForm,
    register,
    showLoginForm,
    login,
    logout,
    listUsers,
    showUser,
    addUser,
    editUser,
    changeRole,
    changePassword,
    removeUser,
};