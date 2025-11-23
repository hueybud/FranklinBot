import { Client, Interaction, Message } from "discord.js";
import { delay, extractPaywallDomainURLs, getLatestArchivedURL, generateReplyMessageWithArchivedURLs, isDMBotOwnerOnArchiveFailureEnabled, getEnviornmentVariable, EnviornmentVariableNames, addPaywallDomainEntry, CommandName, listPaywallDomainEntries, removePaywallDomainEntry, helloFranklin } from "./utils"
const MAX_INVOCATION_ATTEMPT_ON_MESSAGE_CREATION = 3;
const RETRY_DELAY_ON_MESSAGE_CREATION = 5000 // 5 seconds

export async function onMessageCreate(client: Client, message: Message, invocationAttempt = 1) {
    try {
        // Just a safeguard. We technically never reach here
        if (invocationAttempt > 3) {
            console.warn(`Reached our max invocation attempt for a given message ... exiting out to avoid recursion doom`);
            return;
        }

        if (message.author.bot) {
            return;
        }

        console.log(`Incoming message ...`, {
            content: message.content,
            timestamp: message.createdTimestamp,
            invocationAttempt
        });

        const paywallDomainMatchedURLs = await extractPaywallDomainURLs(message.content);
        console.log(`Returned URL list`, { paywallDomainMatchedURLs });
        const archivedLinks = []
        if (paywallDomainMatchedURLs.length) {
            for (const url of paywallDomainMatchedURLs) {
                const latestMemento = await getLatestArchivedURL(url);
                // latestMemento is undefined when we couldn't find an archived link
                archivedLinks.push(latestMemento?.url)
            }
            const replyMessage = generateReplyMessageWithArchivedURLs(archivedLinks.filter((item) => item !== undefined));
            if (replyMessage) {
                // Free the masses
                return await message.reply(replyMessage);
            }
        }
    } catch (err) {
        console.error(`Encounterd an error handling an incoming message`, {
            message,
            err,
            invocationAttempt
        });
        if (invocationAttempt < MAX_INVOCATION_ATTEMPT_ON_MESSAGE_CREATION) {
            console.log(`Invocation attempt ${invocationAttempt} is less than our max invocation attempts ... retrying in ${RETRY_DELAY_ON_MESSAGE_CREATION / 1000} seconds ...`);
            await delay(RETRY_DELAY_ON_MESSAGE_CREATION);
            return await onMessageCreate(client, message, invocationAttempt + 1);
        }
        if (invocationAttempt === MAX_INVOCATION_ATTEMPT_ON_MESSAGE_CREATION) {
            if (isDMBotOwnerOnArchiveFailureEnabled()) {
                console.log(`Reached our max invocation attempts ... inform the bot owner of the issue`);
                try {
                    const botOwner = await client.users.fetch(getEnviornmentVariable(EnviornmentVariableNames.BOT_OWNER_ENV_VAR_NAME));
                    botOwner.send([`Error from the Franklin Bot!`, `Message: ${message.content}`, `Author: ${message.author}`, `Error: ${err}`].join(`\n`));
                } catch (innerErr) {
                    console.error(`Encountered an error attempting to inform the bot operator of the critical error`, { innerErr })
                }
            } else {
                console.error(`Reached our max invocation attempts ... returning out ...`, {
                    message,
                    err,
                });
            }
            return;
        }
    }
}

export async function onInteraction(client: Client, interaction: Interaction) {
    // Right now we only handle commands so this is fine. If that changes, let's move out the below code to being specific to interactionCommands
    if (!interaction.isChatInputCommand()) {
        return;
    };

    try {
        switch (interaction.commandName) {
            case CommandName.ADD_PAYWALL_DOMAIN_NAME:
                await addPaywallDomainEntry(interaction);
                break;
            case CommandName.LIST_PAYWALL_DOMAINS_NAME:
                await listPaywallDomainEntries(interaction);
                break;
            case CommandName.REMOVE_PAYWALL_DOMAIN_NAME:
                await removePaywallDomainEntry(interaction);
                break;
            case CommandName.HELLO_FRANKLIN:
                await helloFranklin(interaction);
                break;
            default:
                return;
        }
    } catch (err) {
        console.error(`Encounterd an error when handling an interaction ...`, {
            interaction,
            err
        });
        try {
            if (isDMBotOwnerOnArchiveFailureEnabled()) {
                const botOwner = await client.users.fetch(getEnviornmentVariable(EnviornmentVariableNames.BOT_OWNER_ENV_VAR_NAME));
                botOwner.send([`Error from the Franklin Bot!`, `Interaction: ${interaction.commandName}`, `Author: ${interaction.member}`, `Error: ${err}`].join(`\n`));
            }
            const genericErrorMessage = `FranklinBot encountered an issue ... apologies!`
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(genericErrorMessage);
            } else {
                await interaction.followUp(genericErrorMessage);
            }
        } catch (innerErr) {
            console.error(`Encountered an error while concluding the interaction ...`, { innerErr })
        }
    }

    return;
}