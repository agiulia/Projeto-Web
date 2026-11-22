const { searchUserbyEmail, updateRole } = require('./src/models/models');

async function main() {
    const email = 'ney@ney';

    const user = await searchUserbyEmail(email);

    if (!user) {
        console.log('Usuário não encontrado. Confira o e-mail.');
        return;
    }

    await updateRole(user.id, 'admin');
    console.log(`${user.name} agora é admin!`);
}

main().catch(console.error);