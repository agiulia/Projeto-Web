const { getAllLoans, acceptLoan, rejectLoan, returnLoan } = require('../models/loanModels');
const { createBook } = require('../models/bookModels');
const { getAllUsers, updateRole, deleteUser } = require('../models/userModels');

const STATUS_LABEL = {
    pendente: 'Pendente',
    aceito: 'Aprovado',
    recusado: 'Recusado',
    devolvido: 'Devolvido',
};

function formatDate(value) {
    if (!value) return '-';
    return new Date(value.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR');
}

async function renderAdmin(req, res, erro = null, status = 200) {
    const loans = await getAllLoans();

    const emprestimos = loans.map((loan) => ({
        id: loan.id,
        usuario: loan.user_name,
        titulo: loan.book_title,
        data: formatDate(loan.data_solicitacao),
        status: loan.status,
        statusLabel: STATUS_LABEL[loan.status] || loan.status,
    }));

    res.status(status).render('admin/painel', {
        usuario: req.session.usuario,
        emprestimos,
        erro,
    });
}

// GET /admin
async function showAdmin(req, res) {
    try {
        await renderAdmin(req, res);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao carregar o painel.');
    }
}

// POST /admin/emprestimos/:id/aceitar
async function accept(req, res) {
    try {
        await acceptLoan(Number(req.params.id));
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        await renderAdmin(req, res, err.message, 400);
    }
}

// POST /admin/emprestimos/:id/recusar
async function reject(req, res) {
    try {
        await rejectLoan(Number(req.params.id));
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        await renderAdmin(req, res, err.message, 400);
    }
}

// POST /admin/emprestimos/:id/devolver
async function giveBack(req, res) {
    try {
        await returnLoan(Number(req.params.id));
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        await renderAdmin(req, res, err.message, 400);
    }
}

// GET /admin/livros
function showBookForm(req, res) {
    res.render('admin/livros', {
        usuario: req.session.usuario,
        erro: null,
        sucesso: null,
    });
}

// POST /admin/livros
async function addBook(req, res) {
    const { isbn, titulo, autores, editora, thumbnail, descricao, qtd_total } = req.body;

    try {
        const total = Number(qtd_total);
        const listaAutores = autores
            ? autores.split(',').map((a) => a.trim()).filter(Boolean)
            : [];

        const result = await createBook(
            isbn ? isbn.trim() : null,
            titulo,
            listaAutores,
            thumbnail || null,
            descricao || null,
            editora || null,
            total
        );

        res.render('admin/livros', {
            usuario: req.session.usuario,
            erro: null,
            sucesso: result.message,
        });
    } catch (err) {
        console.error(err);
        res.status(400).render('admin/livros', {
            usuario: req.session.usuario,
            erro: err.message,
            sucesso: null,
        });
    }
}

async function renderUsers(req, res, erro = null, status = 200) {
    const usuarios = await getAllUsers();

    res.status(status).render('admin/usuarios', {
        usuario: req.session.usuario,
        usuarios,
        erro,
    });
}

// GET /admin/usuarios
async function showUsers(req, res) {
    try {
        await renderUsers(req, res);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao carregar os usuários.');
    }
}

// POST /admin/usuarios/:id/role
async function changeUserRole(req, res) {
    const id = Number(req.params.id);

    try {
        if (id === req.session.usuario.id) {
            throw new Error('Você não pode mudar o seu próprio tipo de conta.');
        }

        await updateRole(id, req.body.role);
        res.redirect('/admin/usuarios');
    } catch (err) {
        console.error(err);
        await renderUsers(req, res, err.message, 400);
    }
}

// POST /admin/usuarios/:id/excluir
async function removeUserAdmin(req, res) {
    const id = Number(req.params.id);

    try {
        if (id === req.session.usuario.id) {
            throw new Error('Você não pode excluir a própria conta.');
        }

        await deleteUser(id);
        res.redirect('/admin/usuarios');
    } catch (err) {
        console.error(err);
        await renderUsers(req, res, err.message, 400);
    }
}

module.exports = {
    showAdmin,
    accept,
    reject,
    giveBack,
    showBookForm,
    addBook,
    showUsers,
    changeUserRole,
    removeUserAdmin
};