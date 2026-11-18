const express = require('express');
const path = require('path');
const app = express();

const initialRoute = require('./routes/initialRoute');
const userRoutes = require('./routes/userRoutes');
app.set('views', path.join(__dirname, 'pages'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', initialRoute);
app.use('/usuarios', userRoutes);

module.exports = app;