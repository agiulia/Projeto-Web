const { searchBooks } = require('../services/googleBooksService');

exports.buscar = async (req, res) => {
  const busca = req.query.busca;

  if (!busca) {
    return res.redirect('/');
  }

  try {
    const livros = await searchBooks(busca);
    res.render('index', { livros, busca, erro: null });
  } catch (err) {
    console.error(err.message);
    res.status(500).render('index', {
      livros: [],
      busca,
      erro: 'Não foi possível buscar os livros.'
    });
  }
};