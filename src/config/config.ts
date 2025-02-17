import dotenv from "dotenv";
dotenv.config();

interface DiscordConfig {
    token: string;
    clientId: string;
    guildId: string;
}

interface DatabaseConfig {
    databaseUrl: string;
    name: string;
    user: string;
    host: string;
    password: string;
    dialect: string;
    port: number;
}

interface AppConfig {
    discord: DiscordConfig;
    database: DatabaseConfig;
}

function getEnvVar(name: string, errorMessage: string): string {
    const value = process.env[name];
    if (!value) {
        console.error(`❌ ${errorMessage}`);
        process.exit(1);
    }
    return value;
}

function getEnvVarNumber(name: string, errorMessage: string): number {
    const value = getEnvVar(name, errorMessage);
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        console.error(`❌ ${name} n'est pas un nombre valide !`);
        process.exit(1);
    }
    return parsed;
}

export const config: AppConfig = {
    discord: {
        token: getEnvVar("DISCORD_TOKEN", "DISCORD_TOKEN est manquant dans le fichier .env !"),
        clientId: getEnvVar("DISCORD_CLIENT_ID", "DISCORD_CLIENT_ID est manquant dans le fichier .env !"),
        guildId: getEnvVar("DISCORD_GUILD_ID", "DISCORD_GUILD_ID est manquant dans le fichier .env !"),
    },
    database: {
        databaseUrl: getEnvVar("DATABASE_URL", "DATABASE_URL est manquant, la connexion à PostgreSQL ne fonctionnera pas."),
        name: getEnvVar("DB_NAME", "DB_NAME est manquant dans le fichier .env !"),
        user: getEnvVar("DB_USER", "DB_USER est manquant dans le fichier .env !"),
        host: getEnvVar("DB_HOST", "DB_HOST est manquant dans le fichier .env !"),
        password: getEnvVar("DB_PASSWORD", "DB_PASSWORD est manquant dans le fichier .env !"),
        dialect: getEnvVar("DB_DIALECT", "DB_DIALECT est manquant dans le fichier .env !"),
        port: getEnvVarNumber("DB_PORT", "DB_PORT est manquant dans le fichier .env ou n'est pas un nombre valide !"),
    },
};