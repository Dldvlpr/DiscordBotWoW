'use strict';

import fs from 'fs';
import path from 'path';
import { Sequelize, DataTypes } from 'sequelize';
import process from 'process';
import dotenv from "dotenv";
dotenv.config();

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

let config: any;
try {
    const configModule = require(path.join(__dirname, '..', 'config', 'config'));
    config = configModule.default ? configModule.default[env] : configModule[env];
} catch (error) {
    console.error("❌ Erreur lors du chargement de la configuration :", error);
    process.exit(1);
}

let sequelize: Sequelize;
try {
    if (config.use_env_variable) {
        sequelize = new Sequelize(process.env[config.use_env_variable] as string, config);
    } else {
        sequelize = new Sequelize(config.database, config.username, config.password, config);
    }
    console.log("✅ Connexion Sequelize initialisée.");
} catch (error) {
    console.error("❌ Erreur lors de l'initialisation de Sequelize :", error);
    process.exit(1);
}

const db: { [key: string]: any } = {};

const loadModels = async () => {
    const modelFiles = fs.readdirSync(__dirname)
        .filter((file: string) =>
            file.indexOf('.') !== 0 &&
            file !== basename &&
            (file.endsWith('.js') || file.endsWith('.ts')) &&
            !file.includes('.test.')
        );

    for (const file of modelFiles) {
        try {
            const { default: model } = await import(path.join(__dirname, file));
            db[model.name] = model(sequelize, DataTypes);
        } catch (error) {
            console.error(`❌ Erreur lors du chargement du modèle ${file} :`, error);
        }
    }

    Object.keys(db).forEach((modelName) => {
        if (db[modelName].associate) {
            db[modelName].associate(db);
        }
    });

    console.log("✅ Modèles chargés :", Object.keys(db));
};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

const testDatabaseConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Connexion à la base de données réussie !");
    } catch (error) {
        console.error("❌ Erreur de connexion à la base de données :", error);
        process.exit(1);
    }
};

(async () => {
    await testDatabaseConnection();
    await loadModels();
})();

export default db;