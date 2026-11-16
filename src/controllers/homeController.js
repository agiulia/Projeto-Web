exports.index = (req, res) => {
  res.render('index', { livros: [], busca: '', erro: null });
};