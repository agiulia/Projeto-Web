require('dotenv').config();

const {searchBooks} = require('./src/services/googleBooksService');
searchBooks('Harry Potter').then(books => {
    console.log(books[0]);
});