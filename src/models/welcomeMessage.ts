import { DataTypes, Model, Optional } from 'sequelize';
import db from "./index";
import { WelcomeMessageInterface } from "../interfaces/welcomeMessage.interface";
import { GuildInstance } from './guildInstance';

interface WelcomeMessageCreationAttributes extends Optional<WelcomeMessageInterface, 'id'> {}

export class WelcomeMessage extends Model<WelcomeMessageInterface, WelcomeMessageCreationAttributes> implements WelcomeMessageInterface {
    public id!: string;
    public guildInstanceId!: string;
    public message!: string;
    public isEnabled!: boolean;
    public createdAt!: Date;
    public updatedAt!: Date;

    public readonly guildInstance?: GuildInstance;
}

WelcomeMessage.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        guildInstanceId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'guild_instance',
                key: 'id'
            },
            onDelete: 'CASCADE',
            unique: true
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "Le message de bienvenue ne peut pas être vide"
                },
                len: {
                    args: [1, 2000],
                    msg: "Le message de bienvenue ne peut pas dépasser 2000 caractères (limite Discord)"
                }
            }
        },
        isEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        }
    },
    {
        sequelize: db.sequelize,
        tableName: 'welcome_messages',
        timestamps: true,
        hooks: {
            beforeCreate: (instance: WelcomeMessage) => {
                const variables = ['{user}', '{usermention}', '{server}'];
                const hasVariable = variables.some(variable => instance.message.includes(variable));

                if (!hasVariable) {
                    console.warn('Message de bienvenue créé sans variables de personnalisation ({user}, {usermention}, {server})');
                }
            }
        }
    }
);

export default WelcomeMessage;