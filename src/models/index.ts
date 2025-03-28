import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import process from 'process';

dotenv.config({ path: '.env.local' });

const env = process.env.NODE_ENV || 'development';

let config: any;
try {
    const configModule = require(path.join(__dirname, '..', 'config', 'config'));
    config = configModule.default ? configModule.default[env] : configModule[env];

    if (!config) {
        throw new Error(`Configuration pour l'environnement "${env}" non trouvée`);
    }
} catch (error) {
    console.error("❌ Erreur lors du chargement de la configuration :", error);
    process.exit(1);
}

let sequelize: Sequelize;
try {
    if (config.use_env_variable && process.env[config.use_env_variable]) {
        sequelize = new Sequelize(process.env[config.use_env_variable] as string, config);
    } else {
        sequelize = new Sequelize(config.database, config.username, config.password, {
            host: config.host,
            dialect: config.dialect,
            port: config.port,
            logging: env === 'development' ? console.log : false,
            pool: {
                max: 10,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
            define: {
                timestamps: true,
                underscored: false
            }
        });
    }
    console.log("✅ Connexion Sequelize initialisée.");
} catch (error) {
    console.error("❌ Erreur lors de l'initialisation de Sequelize :", error);
    process.exit(1);
}

const db: { [key: string]: any } = {
    sequelize,
    Sequelize
};

const testDatabaseConnection = async (): Promise<void> => {
    try {
        await sequelize.authenticate();
        console.log("✅ Connexion à la base de données réussie !");
    } catch (error) {
        console.error("❌ Erreur de connexion à la base de données :", error);
        throw error;
    }
};

const initModels = async (): Promise<void> => {
    const { default: GuildInstance } = await import('./guildInstance');
    const { default: CronJob } = await import('./cronJob');
    const { default: RaidHelperEvent } = await import('./raidHelperEvent');
    const { default: WelcomeMessage } = await import('./welcomeMessage');
    const { default: BotCommand } = await import('./botCommand');
    const { default: BotAutoText } = await import('./botAutoText');
    const { default: ApplicationForm } = await import('./applicationForm');
    const { default: FormQuestion } = await import('./formQuestion');
    const { default: PlayerApplication } = await import('./playerApplication');
    const { default: ApplicationAnswer } = await import('./applicationAnswer');

    db.GuildInstance = GuildInstance;
    db.CronJob = CronJob;
    db.RaidHelperEvent = RaidHelperEvent;
    db.WelcomeMessage = WelcomeMessage;
    db.BotCommand = BotCommand;
    db.BotAutoText = BotAutoText;
    db.ApplicationForm = ApplicationForm;
    db.FormQuestion = FormQuestion;
    db.PlayerApplication = PlayerApplication;
    db.ApplicationAnswer = ApplicationAnswer;

    GuildInstance.hasMany(CronJob, {
        foreignKey: 'guildInstanceId',
        as: 'cronJobs',
        onDelete: 'CASCADE'
    });
    CronJob.belongsTo(GuildInstance, {
        foreignKey: 'guildInstanceId',
        as: 'guildInstance'
    });

    CronJob.hasMany(RaidHelperEvent, {
        foreignKey: 'cronJobId',
        as: 'raidHelperEvents',
        onDelete: 'CASCADE'
    });
    RaidHelperEvent.belongsTo(CronJob, {
        foreignKey: 'cronJobId',
        as: 'cronJob'
    });

    GuildInstance.hasOne(WelcomeMessage, {
        foreignKey: 'guildInstanceId',
        as: 'welcomeMessage',
        onDelete: 'CASCADE'
    });
    WelcomeMessage.belongsTo(GuildInstance, {
        foreignKey: 'guildInstanceId',
        as: 'guildInstance'
    });

    GuildInstance.hasMany(ApplicationForm, {
        foreignKey: 'guildInstanceId',
        as: 'applicationForms',
        onDelete: 'CASCADE'
    });
    ApplicationForm.belongsTo(GuildInstance, {
        foreignKey: 'guildInstanceId',
        as: 'guildInstance'
    });

    ApplicationForm.hasMany(FormQuestion, {
        foreignKey: 'applicationFormId',
        as: 'questions',
        onDelete: 'CASCADE'
    });
    FormQuestion.belongsTo(ApplicationForm, {
        foreignKey: 'applicationFormId',
        as: 'applicationForm'
    });

    ApplicationForm.hasMany(PlayerApplication, {
        foreignKey: 'applicationFormId',
        as: 'applications',
        onDelete: 'CASCADE'
    });
    PlayerApplication.belongsTo(ApplicationForm, {
        foreignKey: 'applicationFormId',
        as: 'applicationForm'
    });

    PlayerApplication.hasMany(ApplicationAnswer, {
        foreignKey: 'playerApplicationId',
        as: 'answers',
        onDelete: 'CASCADE'
    });
    ApplicationAnswer.belongsTo(PlayerApplication, {
        foreignKey: 'playerApplicationId',
        as: 'application'
    });

    FormQuestion.hasMany(ApplicationAnswer, {
        foreignKey: 'questionId',
        as: 'answers',
        onDelete: 'CASCADE'
    });
    ApplicationAnswer.belongsTo(FormQuestion, {
        foreignKey: 'questionId',
        as: 'question'
    });

    console.log("✅ Modèles initialisés avec succès !");
};

(async () => {
    try {
        await testDatabaseConnection();
        await initModels();
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation des modèles :", error);
        process.exit(1);
    }
})();

export default db;