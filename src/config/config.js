"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    token: process.env.DISCORD_TOKEN || "",
    databaseUrl: process.env.DATABASE_URL || "",
    clientId: process.env.DISCORD_CLIENT_ID || "",
    guildId: process.env.DISCORD_GUILD_ID || ""
};
if (!exports.config.token) {
    console.error("❌ DISCORD_TOKEN est manquant dans le fichier .env !");
    process.exit(1);
}
if (!exports.config.databaseUrl) {
    console.warn("⚠️ DATABASE_URL est manquant, la connexion à PostgreSQL ne fonctionnera pas.");
}
console.log("✅ Configuration chargée avec succès.");
