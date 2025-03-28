'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('form_questions', {
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
        questionText: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        questionType: {
            type: Sequelize.ENUM('text', 'select', 'checkbox', 'number'),
            allowNull: false,
            defaultValue: 'text'
        },
        options: {
            type: Sequelize.JSON,
            allowNull: true,
            comment: 'Options pour les questions de type select ou checkbox'
        },
        isRequired: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
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

    await queryInterface.addIndex('form_questions', ['applicationFormId', 'order'], {
        name: 'form_questions_application_order_idx'
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('form_questions');
}