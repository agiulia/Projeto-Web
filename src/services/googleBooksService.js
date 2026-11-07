const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

function buildUrl(term) {
    const query = encodeURIComponent(term);
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

    return `${BASE_URL}?q=${query}&key=${apiKey}`;
}

async function searchBooks(term) {
    const url = buildUrl(term);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Erro ao buscar livros no Google');
    }
    
    const data = await response.json();
    
    // busca sem resultado: o Google nem manda "items"
    if (!data.items) {
        return [];
    }

    return data.items.map((item) => {
        const info = item.volumeInfo;

        return {
            title: info.title || 'Sem título',
            authors: info.authors || ['Autor desconhecido'],
            description: info.description || 'Sem descrição',
            thumbnail: info.imageLinks ? info.imageLinks.thumbnail : null
        };
    });
}

async function searchBooksByAuthor(author) {
    const term = `inauthor:"${author}"`;
    return searchBooks(term);
}

module.exports = { searchBooks, searchBooksByAuthor };