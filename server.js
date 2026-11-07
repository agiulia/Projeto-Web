const dotenv = require('dotenv');
dotenv.config();

console.log('Chave carregada?', !!process.env.GOOGLE_BOOKS_API_KEY);

const app = require('./src/app');
const { initializeDB } = require('./src/config/database');

const PORT = 3000;

async function startServer() {
    try {
        await initializeDB();

        app.listen(PORT, () => {
            console.log(`Servidor rodando em: http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Erro ao iniciar aplicação:', error);
        process.exit(1);
    }
}

startServer();