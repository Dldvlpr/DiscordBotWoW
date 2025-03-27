import { DataTypes, Model } from 'sequelize';
import db from "./index";
import { GuildInstance } from './guildInstance';

export class WelcomeMessage extends Model {
    public id!: string;
    public guildInstanceId!: string;
    public message!: string;
    public isEnabled!: boolean;
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
            }
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
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
    }
);

GuildInstance.hasOne(WelcomeMessage, {
    foreignKey: 'guildInstanceId',
    as: 'welcomeMessage'
});
WelcomeMessage.belongsTo(GuildInstance, {
    foreignKey: 'guildInstanceId',
    as: 'guildInstance'
});

export default WelcomeMessage;