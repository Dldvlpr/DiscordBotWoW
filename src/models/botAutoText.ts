import { DataTypes, Model } from 'sequelize';
import db from "../models/index";

export class BotAutoText extends Model {}

BotAutoText.init(
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
        Message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        sequelize: db.sequelize,
        tableName: 'bot_auto_text',
        timestamps: true,
    }
);
