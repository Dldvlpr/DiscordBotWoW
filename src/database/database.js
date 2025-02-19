"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDatabase = exports.connectDB = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const config_1 = require("../config/config");
exports.sequelize = new sequelize_1.Sequelize(config_1.config.databaseUrl, {
    dialect: "postgres",
    logging: false, // Désactive les logs SQL dans la console
});
// Fonction pour établir la connexion à la base de données
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.sequelize.authenticate();
        console.log("✅ Connexion à la base de données réussie !");
    }
    catch (error) {
        console.error("❌ Impossible de se connecter à la base de données :", error);
        process.exit(1);
    }
});
exports.connectDB = connectDB;
const syncDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.sequelize.sync({ alter: true });
        console.log("✅ Base de données synchronisée !");
    }
    catch (error) {
        console.error("❌ Erreur de synchronisation de la base de données :", error);
    }
});
exports.syncDatabase = syncDatabase;
