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
            allowNull: false
        },
        description: {
            type: Sequelize.TEXT,
            allowNull: true
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

    await queryInterface.addIndex('player_applications', ['userId', 'applicationFormId'], {
        unique: true,
        name: 'player_application_user_form_unique'
    });

    await queryInterface.addIndex('application_answers', ['playerApplicationId', 'questionId'], {
        unique: true,
        name: 'application_answer_application_question_unique'
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('application_answers');
    await queryInterface.dropTable('player_applications');
    await queryInterface.dropTable('form_questions');
    await queryInterface.dropTable('application_forms');
}