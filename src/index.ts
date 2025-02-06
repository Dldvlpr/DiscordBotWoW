import { Bot } from "./bot";
import { config } from "./config/config";

const bot = new Bot();
bot.start();

console.log("🔍 Vérification des variables d’environnement...");
console.log("DISCORD_TOKEN:", config.token ? "✅ Chargé" : "❌ Manquant");
console.log("DATABASE_URL:", config.databaseUrl ? "✅ Chargé" : "❌ Manquant");
console.log("DISCORD_CLIENT_ID:", config.clientId ? "✅ Chargé" : "❌ Manquant");
console.log("DISCORD_GUILD_ID:", config.guildId ? "✅ Chargé" : "❌ Manquant");
