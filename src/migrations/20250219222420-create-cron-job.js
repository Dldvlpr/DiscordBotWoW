'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('cron_jobs', {
        id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        description: {
            type: Sequelize.STRING,
            allowNull: true
        },
        schedule: {
            type: Sequelize.STRING,
            allowNull: false
        },
        isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        categoryId: {
            type: Sequelize.STRING,
            allowNull: true
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

    await queryInterface.addIndex('cron_jobs', ['name', 'guildInstanceId'], {
        unique: true,
        name: 'cron_jobs_name_guild_unique'
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cron_jobs');
}