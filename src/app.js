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

const initialRoute = require('./routes/initialRoute');
const userRoutes = require('./routes/userRoutes');
app.set('views', path.join(__dirname, 'pages'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', initialRoute);
app.use('/usuarios', userRoutes);

module.exports = app;