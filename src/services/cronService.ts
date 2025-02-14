import cron from "node-cron";
import CronJob from "../models/CronJob";
import CronLog from "../models/CronLog";

export async function loadCronJobs() {
    const cronJobs = await CronJob.findAll({ where: { isActive: true } });

    cronJobs.forEach((job) => {
        cron.schedule(job.schedule, async () => {
            try {
                console.log(`⏳ Exécution de la tâche : ${job.name}`);
                await CronLog.create({
                    cronJobId: job.id,
                    status: "SUCCESS",
                    message: `Tâche ${job.name} exécutée avec succès.`,
                });
            } catch (error) {
                await CronLog.create({
                    cronJobId: job.id,
                    status: "FAILED",
                    message: `Erreur lors de l'exécution de ${job.name} : ${error}`,
                });
            }
        });
    });
}