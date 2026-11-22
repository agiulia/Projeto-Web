const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 }
}));

app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  next();
});

app.set('views', path.join(__dirname, 'pages'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const initialRoute = require('./routes/initialRoute');
app.use('/', initialRoute);

const userRoutes = require('./routes/userRoutes');
app.use('/usuarios', userRoutes);

const bookRoutes = require('./routes/bookRoutes');
app.use('/livros', bookRoutes);
module.exports = app;