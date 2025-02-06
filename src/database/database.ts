import { Sequelize } from "sequelize";
import { config } from "../config/config";

export const sequelize = new Sequelize(config.databaseUrl, {
    dialect: "postgres",
    logging: false, // Désactive les logs SQL dans la console
});

// Fonction pour établir la connexion à la base de données
export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Connexion à la base de données réussie !");
    } catch (error) {
        console.error("❌ Impossible de se connecter à la base de données :", error);
        process.exit(1);
    }
};

export const syncDatabase = async () => {
    try {
        await sequelize.sync({ alter: true });
        console.log("✅ Base de données synchronisée !");
    } catch (error) {
        console.error("❌ Erreur de synchronisation de la base de données :", error);
    }
};
