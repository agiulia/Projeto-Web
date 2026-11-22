// verificaddor de login
function requireAuth(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect('/usuarios/login');
    }
    next();
}

// verificador de login e admin
function requireAdmin(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect('/usuarios/login');
    }
    if (req.session.usuario.role !== 'admin') {
        // 403 é um código de proibidp
        return res.status(403).send('Acesso negado: apenas administradores.');
    }
    next();
}

module.exports = { requireAuth, requireAdmin };