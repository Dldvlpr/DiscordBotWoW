import { DataTypes, Model, Sequelize } from 'sequelize';

export class BotCommand extends Model {
    public id!: number;
    public name!: string;
    public description!: string;
}

export function initBotCommand(sequelize: Sequelize): void {
    BotCommand.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        },
        {
            sequelize,
            tableName: 'bot_commands',
            timestamps: true,
        }
    );
}

export default BotCommand;