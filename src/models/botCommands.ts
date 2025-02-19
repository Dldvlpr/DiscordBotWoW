import { DataTypes, Model } from 'sequelize';
import db from "./index";

export class BotCommand extends Model {}

BotCommand.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize: db.sequelize,
        tableName: 'bot_commands',
        timestamps: true,
    }
);

db.sequelize.sync()
    .then(() => console.log('Base de données synchronisée'))
    .catch((err: Error) => console.error('Erreur lors de la synchronisation', err));
