import { sequelize } from '../database/sequelize';
import BotCommand, { initBotCommand } from './BotCommands';
import CronJob, { initCronJob } from './CronJob';
import CronLog, { initCronLog } from './CronLog';

export const initializeModels = async (): Promise<void> => {
    try {
        initBotCommand(sequelize);
        initCronJob(sequelize);
        initCronLog(sequelize);

        CronJob.hasMany(CronLog, { foreignKey: 'cronJobId', as: 'logs' });
        CronLog.belongsTo(CronJob, { foreignKey: 'cronJobId', as: 'job' });

        console.log('✅ Modèles initialisés avec succès.');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des modèles:', error);
        throw error;
    }
};

export { BotCommand, CronJob, CronLog };