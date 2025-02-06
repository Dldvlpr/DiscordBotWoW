import dotenv from "dotenv";

dotenv.config();

export const config = {
    token: process.env.DISCORD_TOKEN || "",
    databaseUrl: process.env.DATABASE_URL || "",
    clientId: process.env.DISCORD_CLIENT_ID || "",
    guildId: process.env.DISCORD_GUILD_ID || ""
};

if (!config.token) {
    console.error("❌ DISCORD_TOKEN est manquant dans le fichier .env !");
    process.exit(1);
}

if (!config.databaseUrl) {
    console.warn("⚠️ DATABASE_URL est manquant, la connexion à PostgreSQL ne fonctionnera pas.");
}

console.log("✅ Configuration chargée avec succès.");
