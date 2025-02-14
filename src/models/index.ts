import sequelize from "sequelize";
import CronJob from "./CronJob";
import BotCommands from "./BotCommands";
import CronLog from "./CronLog";

// Déclare les relations entre les modèles ici si nécessaire
CronJob.hasMany(CronLog, { foreignKey: "cronJobId" });
CronLog.belongsTo(CronJob, { foreignKey: "cronJobId" });

export { sequelize, CronJob, BotCommands, CronLog };