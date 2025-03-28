'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('player_applications', {
        id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4
        },
        applicationFormId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'application_forms',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        userId: {
            type: Sequelize.STRING,
            allowNull: false,
            comment: 'Discord ID du joueur'
        },
        username: {
            type: Sequelize.STRING,
            allowNull: false
        },
        status: {
            type: Sequelize.ENUM('pending', 'approved', 'rejected', 'withdrawn'),
            allowNull: false,
            defaultValue: 'pending'
        },
        reviewerId: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Discord ID du staff qui a traité la candidature'
        },
        reviewerName: {
            type: Sequelize.STRING,
            allowNull: true
        },
        reviewComment: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        reviewedAt: {
            type: Sequelize.DATE,
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

    await queryInterface.addIndex('player_applications', ['userId', 'applicationFormId'], {
        unique: true,
        name: 'player_application_user_form_unique'
    });

    await queryInterface.addIndex('player_applications', ['status'], {
        name: 'player_applications_status_idx'
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('player_applications');
}