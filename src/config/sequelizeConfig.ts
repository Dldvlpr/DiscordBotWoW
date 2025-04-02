import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const config = {
    development: {
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || null,
        database: process.env.DB_NAME || 'discordBot',
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    },
    test: {
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || null,
        database: process.env.DB_NAME ? `${process.env.DB_NAME}_test` : 'discordBot_test',
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    },
    production: {
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || null,
        database: process.env.DB_NAME ? `${process.env.DB_NAME}_production` : 'discordBot_production',
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    },
};

module.exports = config;