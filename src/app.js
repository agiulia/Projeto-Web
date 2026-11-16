const express = require('express');
const path = require('path');
const app = express();

app.set('views', path.join(__dirname, 'pages'));

app.use(express.json());

app.set('view engine', 'ejs');
app.use('/', require('./routes/initialRoute'));

module.exports = app;