import { DataTypes, Model, Optional } from 'sequelize';
import db from "./index";
import { BotCommandInterface } from "../interfaces/botCommand.interface";

interface BotCommandCreationAttributes extends Optional<BotCommandInterface, 'id'> {}

export class BotCommand extends Model<BotCommandInterface, BotCommandCreationAttributes> implements BotCommandInterface {
    public id!: string;
    public name!: string;
    public description?: string;
    public createdAt!: Date;
    public updatedAt!: Date;
}

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
            validate: {
                notEmpty: {
                    msg: "Le nom de la commande ne peut pas être vide"
                },
                len: {
                    args: [1, 32],
                    msg: "Le nom de la commande doit faire entre 1 et 32 caractères (limite Discord)"
                },
                is: {
                    args: /^[a-z0-9_-]+$/i,
                    msg: "Le nom de la commande ne peut contenir que des lettres, chiffres, tirets et underscores"
                }
            }
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                len: {
                    args: [0, 100],
                    msg: "La description ne peut pas dépasser 100 caractères (limite Discord)"
                }
            }
        }
    },
    {
        sequelize: db.sequelize,
        tableName: 'bot_commands',
        timestamps: true
    }
);

export default BotCommand;