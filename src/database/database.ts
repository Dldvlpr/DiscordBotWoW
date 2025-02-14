import { Sequelize } from "sequelize";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = new URL(process.env.DATABASE_URL as string);
const databaseName = databaseUrl.pathname.substring(1);
const databaseUrlData = process.env.DATABASE_URL as string;
const adminDatabaseUrl = databaseUrlData.replace(databaseName, "postgres");

const checkAndCreateDatabase = async () => {
    const client = new Client({ connectionString: adminDatabaseUrl });

    try {
        await client.connect();
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${databaseName}'`);

        if (res.rowCount === 0) {
            console.log(`📦 La base de données "${databaseName}" n'existe pas. Création en cours...`);
            await client.query(`CREATE DATABASE ${databaseName}`);
            console.log(`✅ Base de données "${databaseName}" créée avec succès.`);
        } else {
            console.log(`✅ La base de données "${databaseName}" existe déjà.`);
        }
    } catch (error) {
        console.error("❌ Erreur lors de la vérification/ création de la base :", error);
    } finally {
        await client.end();
    }
};

const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
    dialect: "postgres",
    logging: false,
});

export const connectDB = async () => {
    await checkAndCreateDatabase();
    try {
        await sequelize.authenticate();
        console.log("✅ Connexion à la base de données réussie.");
    } catch (error) {
        console.error("❌ Erreur de connexion à la base :", error);
        process.exit(1);
    }
};

export const syncDatabase = async () => {
    try {
        await sequelize.sync({ alter: true });
        console.log("✅ Tables synchronisées.");
    } catch (error) {
        console.error("❌ Erreur lors de la synchronisation des tables :", error);
    }
};

export default sequelize;