const { createUser } = require('../models/models');

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
        res.redirect('/login');
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

module.exports = { showRegisterForm, register };