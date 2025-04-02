import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Bot } from './bot';

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('⚠️ Uncaught Exception:', error);
});



console.log('✅ Configuration chargée avec succès.');
console.log('🔍 Vérification des variables d\'environnement...');

const requiredEnvVars = [
    'NODE_ENV',
    'DISCORD_TOKEN',
    'DATABASE_URL',
    'DISCORD_CLIENT_ID',
    'DISCORD_GUILD_ID',
    'DB_NAME',
    'DB_USER',
    'DB_HOST',
    'DB_PASSWORD',
    'DB_DIALECT',
    'DB_PORT'
];

for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
        console.log(`${envVar}: ✅ Chargé`);
    } else {
        console.error(`${envVar}: ❌ Manquant`);
        process.exit(1);
    }
}

async function startApplication(): Promise<void> {
    try {
        const bot = new Bot();
        await bot.start();

        console.log('🚀 Application démarrée avec succès.');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de l\'application:', error);
        process.exit(1);
    }
}

startApplication();