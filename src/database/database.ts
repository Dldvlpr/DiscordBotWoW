import { Sequelize } from "sequelize";
import pgtools, {Opts} from "pgtools";
import { URL } from "url";

export async function initializeDatabase(opts_: Opts, dbName: string): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error("DATABASE_URL n'est pas défini dans les variables d'environnement.");
    }

    const parsedUrl = new URL(dbUrl);
    const dbName = parsedUrl.pathname.replace(/^\//, "");
    const config = {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port) || 5432,
        user: parsedUrl.username,
        password: parsedUrl.password,
    };

    try {
        await pgtools.createdb(config, dbName, {ifNotExists: true});
        console.log(`La base de données "${dbName}" a été vérifiée/créée avec succès.`);
    } catch (error) {
        console.error("Erreur lors de la création ou de la vérification de la DB :", error);
        throw error;
    }

    const sequelize = new Sequelize(dbUrl, {
        dialect: "postgres",
        logging: false,
    });

    try {
        await sequelize.sync({ alter: true });
        console.log("Les tables ont été synchronisées (créées/ajustées si manquantes).");
    } catch (syncError) {
        console.error("Erreur lors de la synchronisation des tables :", syncError);
        throw syncError;
    }
}