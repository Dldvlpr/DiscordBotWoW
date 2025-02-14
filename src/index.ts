import database from './database/database';
import { initializeModels } from './models';
import dotenv from 'dotenv';

dotenv.config();

console.log('✅ Configuration chargée avec succès.');
console.log('🔍 Vérification des variables d\'environnement...');

const requiredEnvVars = ['DISCORD_TOKEN', 'DATABASE_URL', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'];
for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
        console.log(`${envVar}: ✅ Chargé`);
    } else {
        console.error(`${envVar}: ❌ Manquant`);
        process.exit(1);
    }
}

async function startApp() {
    try {
        console.log('Initialisation de la DB et des Models');

        await database.initializeDatabase();
        await initializeModels();

        console.log('✅ Application démarrée avec succès');
    } catch (error) {
        console.error('❌ Erreur au lancement de l\'application :', error);
        process.exit(1);
    }
}

startApp();