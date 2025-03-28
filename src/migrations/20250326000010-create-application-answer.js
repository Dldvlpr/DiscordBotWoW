'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('application_answers', {
        id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4
        },
        playerApplicationId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'player_applications',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        questionId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'form_questions',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        answerText: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        answerValue: {
            type: Sequelize.JSON,
            allowNull: true,
            comment: 'Pour les réponses de type select ou checkbox'
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

    await queryInterface.addIndex('application_answers', ['playerApplicationId', 'questionId'], {
        unique: true,
        name: 'application_answer_application_question_unique'
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('application_answers');
}