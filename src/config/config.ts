import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

interface DBConfig {
  username: string | null;
  password: string | null;
  database: string;
  host: string;
  dialect: string;
  port: number;
  use_env_variable?: string;
}

interface DiscordConfig {
  token: string;
  clientId: string;
  guildId: string;
}

interface EnvConfig extends DBConfig {
  discord: DiscordConfig;
}

interface Config {
  development: EnvConfig;
  test: EnvConfig;
  production: EnvConfig;
}

const commonDBConfig: Partial<DBConfig> = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || null,
  host: process.env.DB_HOST || '127.0.0.1',
  dialect: process.env.DB_DIALECT || 'postgres',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
};

const discordConfig: DiscordConfig = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
};

const config: Config = {
  development: {
    ...commonDBConfig as DBConfig,
    database: process.env.DB_NAME || 'discordBot',
    discord: discordConfig,
  },
  test: {
    ...commonDBConfig as DBConfig,
    database: process.env.DB_NAME ? `${process.env.DB_NAME}_test` : 'discordBot_test',
    discord: discordConfig,
  },
  production: {
    ...commonDBConfig as DBConfig,
    database: process.env.DB_NAME ? `${process.env.DB_NAME}` : 'discordBot_production',
    discord: discordConfig,
  },
};

module.exports = config;
export default config;