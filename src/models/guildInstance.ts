import { DataTypes, Model, Optional } from 'sequelize';
import db from "./index";
import { GuildInstanceInterface } from "../interfaces/guildInstance.interface";
import { CronJob } from './cronJob';
import { WelcomeMessage } from './welcomeMessage';

interface GuildInstanceCreationAttributes extends Optional<GuildInstanceInterface, 'id'> {}

export class GuildInstance extends Model<GuildInstanceInterface, GuildInstanceCreationAttributes> implements GuildInstanceInterface {
    public id!: string;
    public guildId!: string;
    public guildName?: string;
    public createdAt!: Date;
    public updatedAt!: Date;

    public readonly cronJobs?: CronJob[];
    public readonly welcomeMessage?: WelcomeMessage;
}

GuildInstance.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        guildId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: {
                    msg: "L'ID de la guilde ne peut pas être vide"
                },
                is: {
                    args: /^\d{17,19}$/,
                    msg: "L'ID de la guilde doit être un identifiant Discord valide"
                }
            }
        },
        guildName: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                len: {
                    args: [0, 100],
                    msg: "Le nom de la guilde ne peut pas dépasser 100 caractères"
                }
            }
        }
    },
    {
        sequelize: db.sequelize,
        modelName: 'GuildInstance',
        tableName: 'guild_instance',
        timestamps: true,
        hooks: {
            beforeValidate: (instance: GuildInstance) => {
                if (instance.guildId && typeof instance.guildId !== 'string') {
                    instance.guildId = String(instance.guildId);
                }
            },
            beforeCreate: (instance: GuildInstance) => {
                console.log(`Création d'une nouvelle instance de guilde: ${instance.guildName}`);
            }
        }
    }
);

export default GuildInstance;