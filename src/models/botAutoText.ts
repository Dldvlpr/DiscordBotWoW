import { DataTypes, Model, Optional } from 'sequelize';
import db from "./index";
import { BotAutoTextInterface } from "../interfaces/botAutoText.interface";

interface BotAutoTextCreationAttributes extends Optional<BotAutoTextInterface, 'id'> {}

export class BotAutoText extends Model<BotAutoTextInterface, BotAutoTextCreationAttributes> implements BotAutoTextInterface {
    public id!: string;
    public name!: string;
    public message!: string;
    public createdAt!: Date;
    public updatedAt!: Date;
}

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
            unique: true,
            validate: {
                notEmpty: {
                    msg: "Le nom du texte automatique ne peut pas être vide"
                },
                len: {
                    args: [1, 100],
                    msg: "Le nom du texte automatique doit faire entre 1 et 100 caractères"
                }
            }
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "Le message ne peut pas être vide"
                }
            }
        }
    },
    {
        sequelize: db.sequelize,
        tableName: 'bot_auto_text',
        timestamps: true
    }
);

export default BotAutoText;