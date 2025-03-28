import { DataTypes, Model, Optional } from 'sequelize';
import db from "./index";
import { ApplicationAnswer } from './applicationAnswer';

interface PlayerApplicationAttributes {
    id: string;
    applicationFormId: string;
    userId: string;
    username: string;
    status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
    reviewerId?: string;
    reviewerName?: string;
    reviewComment?: string;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

interface PlayerApplicationCreationAttributes extends Optional<PlayerApplicationAttributes, 'id' | 'createdAt' | 'updatedAt' | 'status'> {}

export class PlayerApplication extends Model<PlayerApplicationAttributes, PlayerApplicationCreationAttributes> implements PlayerApplicationAttributes {
    public id!: string;
    public applicationFormId!: string;
    public userId!: string;
    public username!: string;
    public status!: 'pending' | 'approved' | 'rejected' | 'withdrawn';
    public reviewerId?: string;
    public reviewerName?: string;
    public reviewComment?: string;
    public reviewedAt?: Date;
    public createdAt!: Date;
    public updatedAt!: Date;

    // Associations
    public readonly answers?: ApplicationAnswer[];
}

PlayerApplication.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        applicationFormId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'application_forms',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isValidDiscordId(value: string) {
                    if (!/^\d{17,19}$/.test(value)) {
                        throw new Error("L'ID utilisateur doit être un identifiant Discord valide");
                    }
                }
            }
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected', 'withdrawn'),
            allowNull: false,
            defaultValue: 'pending',
            validate: {
                isIn: {
                    args: [['pending', 'approved', 'rejected', 'withdrawn']],
                    msg: "Le statut doit être 'pending', 'approved', 'rejected' ou 'withdrawn'"
                }
            }
        },
        reviewerId: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isValidDiscordId(value: string | null) {
                    if (value !== null && !/^\d{17,19}$/.test(value)) {
                        throw new Error("L'ID de l'examinateur doit être un identifiant Discord valide");
                    }
                }
            }
        },
        reviewerName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        reviewComment: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        reviewedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        sequelize: db.sequelize,
        tableName: 'player_applications',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['userId', 'applicationFormId'],
                name: 'player_application_user_form_unique'
            }
        ],
        hooks: {
            beforeUpdate: (instance: PlayerApplication) => {
                if (instance.changed('status') && (instance.status === 'approved' || instance.status === 'rejected')) {
                    if (!instance.reviewedAt) {
                        instance.reviewedAt = new Date();
                    }
                }
            }
        }
    }
);

export default PlayerApplication;