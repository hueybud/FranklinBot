import 'dotenv/config'
import { Client, Events, GatewayIntentBits, Partials } from "discord.js"
import { EnviornmentVariableNames, getEnviornmentVariable, registerCommands } from './utils';
import { onInteraction, onMessageCreate } from './handlers';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel]
});

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    await registerCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
    await onInteraction(client, interaction);
});

client.on(Events.MessageCreate, async (message) => {
    await onMessageCreate(client, message);
});

// Log in to Discord with your client's token
client.login(getEnviornmentVariable(EnviornmentVariableNames.DISCORD_TOKEN_ENV_VAR_NAME));

