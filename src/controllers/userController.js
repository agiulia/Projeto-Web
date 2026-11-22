const bcrypt = require('bcrypt'); // se o models usa bcryptjs, troque aqui
const { createUser, searchUserForLogin } = require('../models/models');

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

module.exports = { showRegisterForm, register, showLoginForm, login, logout };