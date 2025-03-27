import { Client, Events, Interaction, GuildMember, TextChannel } from 'discord.js';
import { CommandHandler } from './CommandHandler';
import { GuildInstance } from '../models/guildInstance';
import { WelcomeMessage } from '../models/welcomeMessage';
import { CronJob as CronJobModel } from '../models/cronJob';
import { RaidHelperEvent } from '../models/raidHelperEvent';
import { CronJob } from 'cron';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export class EventHandler {
    private cronJobs: Map<string, CronJob> = new Map();

    constructor(private client: Client, private commandHandler: CommandHandler) {
        this.registerEvents();
        this.initCronJobs();
    }

    private registerEvents(): void {
        this.client.once(Events.ClientReady, () => {
            console.log(`✅ Bot prêt ! Connecté en tant que ${this.client.user?.tag}`);
        });

        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (interaction.isChatInputCommand()) {
                const command = this.commandHandler.getCommand(interaction.commandName);
                if (!command) return;

                try {
                    await command.execute(interaction, this.client);
                } catch (error) {
                    console.error(error);
                    await interaction.reply({
                        content: 'Une erreur est survenue lors de l\'exécution de la commande.',
                        ephemeral: true
                    });
                }
            }
        });

        this.client.on(Events.GuildMemberAdd, async (member) => {
            await this.handleNewMember(member);
        });
    }

    private async handleNewMember(member: GuildMember): Promise<void> {
        try {
            const guildInstance = await GuildInstance.findOne({
                where: { guildId: member.guild.id }
            });

            if (!guildInstance) return;

            const welcomeMessage = await WelcomeMessage.findOne({
                where: {
                    guildInstanceId: guildInstance.id,
                    isEnabled: true
                }
            });

            if (!welcomeMessage) return;

            const formattedMessage = welcomeMessage.message
                .replace(/{user}/g, member.user.username)
                .replace(/{usermention}/g, `<@${member.id}>`)
                .replace(/{server}/g, member.guild.name);

            try {
                await member.send(formattedMessage);
                console.log(`Message de bienvenue envoyé en MP à ${member.user.tag}`);
            } catch (dmError) {
                console.error(`Impossible d'envoyer un MP à ${member.user.tag}:`, dmError);

                // Option: on pourrait avoir un canal de fallback ici si les MPs sont désactivés
                // const logChannel = await member.guild.channels.fetch(welcomeMessage.fallbackChannelId) as TextChannel;
                // if (logChannel) {
                //     await logChannel.send(`⚠️ Impossible d'envoyer un message de bienvenue à ${member.user.tag}. Ils ont probablement désactivé les MPs.`);
                // }
            }
        } catch (error) {
            console.error("Erreur lors de l'envoi du message de bienvenue:", error);
        }
    }
    private async initCronJobs(): Promise<void> {
        try {
            if (!this.client.isReady()) {
                await new Promise<void>((resolve) => {
                    this.client.once('ready', () => resolve());
                });
            }

            console.log("🕒 Initialisation des tâches planifiées...");

            for (const [_, job] of this.cronJobs) {
                job.stop();
            }
            this.cronJobs.clear();

            const activeJobs = await CronJobModel.findAll({
                where: { isActive: true },
                include: [{
                    model: RaidHelperEvent,
                    as: 'raidHelperEvents'
                }]
            });

            for (const job of activeJobs) {
                this.scheduleCronJob(job);
            }

            console.log(`✅ ${this.cronJobs.size} tâches planifiées initialisées.`);
        } catch (error) {
            console.error("Erreur lors de l'initialisation des tâches planifiées:", error);
        }
    }

    private scheduleCronJob(cronJobModel: CronJobModel): void {
        const job = new CronJob(
            cronJobModel.schedule,
            async () => {
                try {
                    await this.executeCronJob(cronJobModel);
                } catch (error) {
                    console.error(`Erreur lors de l'exécution de la tâche ${cronJobModel.name}:`, error);
                }
            },
            null,
            true,
            'Europe/Paris'
        );

        this.cronJobs.set(cronJobModel.id, job);
    }

    private async executeCronJob(cronJobModel: CronJobModel): Promise<void> {
        try {
            if (cronJobModel.categoryId) {
                await this.createTextChannel(cronJobModel);
                return;
            }

            const raidHelperEvent = await RaidHelperEvent.findOne({
                where: { cronJobId: cronJobModel.id }
            });

            if (raidHelperEvent) {
                await this.createRaidHelperEvent(raidHelperEvent);
                return;
            }

            console.log(`Aucune action définie pour la tâche ${cronJobModel.name}`);
        } catch (error) {
            console.error(`Erreur lors de l'exécution de la tâche ${cronJobModel.name}:`, error);
        }
    }

    private async createTextChannel(cronJobModel: CronJobModel): Promise<void> {
        try {
            const guildInstance = await GuildInstance.findByPk(cronJobModel.guildInstanceId);
            if (!guildInstance) return;

            const guild = await this.client.guilds.fetch(guildInstance.guildId);
            if (!guild) return;

            const today = new Date();
            const channelName = `${cronJobModel.name}-${format(today, 'yyyy-MM-dd')}`;

            const channel = await guild.channels.create({
                name: channelName,
                type: 0,
                parent: cronJobModel.categoryId
            });

            console.log(`Canal créé: ${channel.name} dans ${guild.name}`);
        } catch (error) {
            console.error(`Erreur lors de la création du canal:`, error);
        }
    }

    private async createRaidHelperEvent(raidHelperEvent: RaidHelperEvent): Promise<void> {
        try {
            const channel = await this.client.channels.fetch(raidHelperEvent.channelId) as TextChannel;
            if (!channel) {
                console.error(`Canal introuvable pour l'événement RaidHelper ${raidHelperEvent.id}`);
                return;
            }

            const today = new Date();
            const formattedDate = format(today, 'dd-MMMM-yyyy', { locale: fr });
            const formattedTime = raidHelperEvent.raidTime || '20:00';

            let command = `/raidhelper create`;

            if (raidHelperEvent.raidTemplateId) {
                command += ` template:${raidHelperEvent.raidTemplateId}`;
            }

            command += ` title:${raidHelperEvent.raidName} ${formattedDate}`;

            if (raidHelperEvent.raidDescription) {
                command += ` description:${raidHelperEvent.raidDescription}`;
            }

            command += ` time:${formattedTime}`;

            await channel.send(command);

            console.log(`Commande RaidHelper envoyée dans ${channel.name} : ${command}`);
        } catch (error) {
            console.error(`Erreur lors de la création de l'événement RaidHelper:`, error);
        }
    }
}