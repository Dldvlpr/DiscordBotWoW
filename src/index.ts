import { sequelize } from './database/sequelize';
import { initDatabase } from './database';
import dotenv from 'dotenv';

dotenv.config();

console.log('✅ Configuration chargée avec succès.');
console.log('🔍 Vérification des variables d\'environnement...');

const requiredEnvVars = [
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
        let dbName: string = process.env.DB_NAME!;

        console.log('🔍 Vérification et création de la base de données si nécessaire...');
        console.log(dbName)
        await initDatabase(dbName);

        console.log('🔄 Connexion à la base de données...');
        await sequelize.authenticate();
        console.log('✅ Connexion réussie.');

        console.log('📦 Synchronisation des modèles avec la base de données...');
        await sequelize.sync({ alter: true });
        console.log('✅ Synchronisation terminée.');

        console.log('🚀 Initialisation des modèles...');
        console.log('✅ Modèles initialisés.');

        console.log('🚀 Application démarrée avec succès.');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de l\'application:', error);
        process.exit(1);
    }
}

startApplication();