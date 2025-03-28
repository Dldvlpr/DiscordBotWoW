'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('application_forms', {
        id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4
        },
        guildInstanceId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'guild_instance',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        title: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        description: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        notificationChannelId: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'ID du canal où les notifications de nouvelles candidatures seront envoyées'
        },
        applicationChannelId: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'ID du canal où les candidatures seront soumises'
        },
        reviewRoleId: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'ID du rôle autorisé à examiner les candidatures'
        },
        successMessage: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Message envoyé aux candidats acceptés'
        },
        rejectMessage: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Message envoyé aux candidats rejetés'
        },
        acceptedRoleId: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Rôle à attribuer aux candidats acceptés'
        },
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('application_forms');
}