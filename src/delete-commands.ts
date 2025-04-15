import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
    console.error("Missing environment variables");
    process.exit(1);
}

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started deleting application commands...');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: [] }
        );

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: [] }
        );

        console.log('Successfully deleted all application commands.');
    } catch (error) {
        console.error(error);
    }
})();