'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('raid_helper_events', {
        id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4
        },
        cronJobId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'cron_jobs',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        raidName: {
            type: Sequelize.STRING,
            allowNull: false
        },
        raidDescription: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        raidTime: {
            type: Sequelize.STRING,
            allowNull: true
        },
        maxParticipants: {
            type: Sequelize.INTEGER,
            allowNull: true
        },
        channelId: {
            type: Sequelize.STRING,
            allowNull: true
        },
        raidTemplateId: {
            type: Sequelize.STRING,
            allowNull: true
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
    await queryInterface.dropTable('raid_helper_events');
}