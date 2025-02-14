// src/models/index.ts
import { sequelize } from '../database/database';
import BotCommand, { initBotCommand } from './BotCommands';
import CronJob, { initCronJob } from './CronJob';
import CronLog, { initCronLog } from './CronLog';

export const initializeModels = async () => {
    try {
        // Initialiser les modèles
        initBotCommand();
        initCronJob();
        initCronLog();

        // Définir les relations
        CronJob.hasMany(CronLog, { foreignKey: "cronJobId" });
        CronLog.belongsTo(CronJob, { foreignKey: "cronJobId" });

        // Synchroniser avec la base de données
        await sequelize.sync({ alter: true });
        console.log("✅ Modèles synchronisés avec succès");
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation des modèles:", error);
        throw error;
    }
};

export { BotCommand, CronJob, CronLog };