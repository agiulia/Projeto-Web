const { getAllLoans, acceptLoan, rejectLoan } = require('../models/loanModels');

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

    res.status(status).render('usuarios/perfiladm', {
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

module.exports = { showAdmin, accept, reject };