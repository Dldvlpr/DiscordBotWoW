import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database";

class BotCommand extends Model {
    public id!: string;
    public name!: string;
    public description!: string;
    public response!: string;
    public isEnabled!: boolean;
}

export function initBotCommand() {
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
                unique: true,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            response: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            isEnabled: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
        },
        {
            sequelize,
            tableName: "bot_commands",
            timestamps: true,
        }
    );
}

export default BotCommand;