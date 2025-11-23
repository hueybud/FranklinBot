import { ChatInputCommandInteraction, Interaction, InteractionResponse, MessageFlags, REST, Routes, SlashCommandBuilder } from "discord.js";
import { EnviornmentVariableNames, getEnviornmentVariable, getPaywallDomainListContents, validateDomainInput, writeToPaywallDomainList } from ".";

export enum EmojiStatus {
    NOTICE = "⚠️",
    SUCCESS = "✅",
    ERROR = "❌"
}

export enum CommandName {
    ADD_PAYWALL_DOMAIN_NAME = "addpaywalldomain",
    LIST_PAYWALL_DOMAINS_NAME = "listpaywalldomains",
    REMOVE_PAYWALL_DOMAIN_NAME = "removepaywalldomain"
}

export async function registerCommands() {
    const rest = new REST().setToken(getEnviornmentVariable(EnviornmentVariableNames.DISCORD_TOKEN_ENV_VAR_NAME));
    const appId = getEnviornmentVariable(EnviornmentVariableNames.APP_ID_ENV_VAR_NAME);

    const commands = [
        new SlashCommandBuilder().setName(CommandName.ADD_PAYWALL_DOMAIN_NAME).setDescription('Adds a domain to the paywall domain list for archive lookup eligibility').addStringOption((option) => option.setName('domain').setDescription('The domain to add to the paywall domain list').setRequired(true)),
        new SlashCommandBuilder().setName(CommandName.LIST_PAYWALL_DOMAINS_NAME).setDescription('Lists the domains in the paywall domain list'),
        new SlashCommandBuilder().setName(CommandName.REMOVE_PAYWALL_DOMAIN_NAME).setDescription('Removes a domain from the paywall domain list').addStringOption((option) => option.setName('domain').setDescription('The domain to remove from the paywall domain list').setRequired(true)),
    ]

    await rest.put(Routes.applicationCommands(appId), { body: commands });
}

export async function addPaywallDomainEntry(interaction: ChatInputCommandInteraction): Promise<InteractionResponse> {
    console.log(`Add paywall domain entry ...`);
    const incomingDomainContent = interaction.options.getString("domain");
    if (!incomingDomainContent) {
        return await interaction.reply(`${EmojiStatus.NOTICE} You must supply a domain to add to the list`);
    }
    const sanitizedDomainToAdd = validateDomainInput(incomingDomainContent);
    if (!sanitizedDomainToAdd) {
        return await interaction.reply(`${EmojiStatus.NOTICE} Please supply a valid domain to add to the list. Valid domains do not have the TLD at the end i.e \`bloomberg\` instead of \`bloomberg.com\``)
    }
    const paywallDomainList = await getPaywallDomainListContents();
    const isDomainAlreadyInList = paywallDomainList.find((domain) => domain === sanitizedDomainToAdd);
    if (isDomainAlreadyInList) {
        return await interaction.reply(`${EmojiStatus.NOTICE} **${sanitizedDomainToAdd}** already existed in the list -- there is nothing for us to add! You can always use the \`\\${CommandName.LIST_PAYWALL_DOMAINS_NAME}\` command to view the currently supported domains`)
    }
    paywallDomainList.push(sanitizedDomainToAdd)
    await writeToPaywallDomainList(paywallDomainList);
    const successMessage = `${EmojiStatus.SUCCESS} Successfully added **${sanitizedDomainToAdd}** to the paywall domain list!`
    console.log(successMessage);
    return await interaction.reply(successMessage)

}

export async function listPaywallDomainEntries(interaction: ChatInputCommandInteraction) {
    console.log(`List paywall domain entries ...`);
    await interaction.deferReply();
    const paywallDomainList = await getPaywallDomainListContents();
    // Limit is 4096 characters per message. Chunking for when we inevitably get pentested
    const chunkSize = 4000;
    const listString = paywallDomainList.join(", ");
    for (let i = 0; i < listString.length; i += chunkSize) {
        const chunk = listString.slice(i, i + chunkSize);
        await interaction.followUp({embeds: [{
            title: `Paywall Domain List`,
            description: '```' + '\n' + chunk + '\n' + '```'
        }]})
    };
}

export async function removePaywallDomainEntry(interaction: ChatInputCommandInteraction): Promise<InteractionResponse> {
    console.log(`Remove paywall domain entry ...`);
    const incomingDomainContent = interaction.options.getString("domain");
    if (!incomingDomainContent) {
        return await interaction.reply(`${EmojiStatus.NOTICE} You must supply a domain to remove from the list`);
    }
    const sanitizedDomainToRemove = validateDomainInput(incomingDomainContent);
    if (!sanitizedDomainToRemove) {
        return await interaction.reply(`${EmojiStatus.NOTICE} Please supply a valid domain to remove from the list. Valid domains do not have the TLD at the end i.e \`bloomberg\` instead of \`bloomberg.com\``)
    }
    const paywallDomainList = await getPaywallDomainListContents();
    const domainIndex = paywallDomainList.findIndex((domain) => domain === sanitizedDomainToRemove);
    if (domainIndex === -1) {
        return await interaction.reply(`${EmojiStatus.NOTICE} **${sanitizedDomainToRemove}** does not exist in the list -- there is nothing for us to remove! You can always use the \`\\${CommandName.LIST_PAYWALL_DOMAINS_NAME}\` command to view the currently supported domains`)
    }
    paywallDomainList.splice(domainIndex, 1)
    await writeToPaywallDomainList(paywallDomainList)
    const successMessage = `${EmojiStatus.SUCCESS} Successfully removed **${sanitizedDomainToRemove}** from the paywall domain list!`
    console.log(successMessage);
    return await interaction.reply(successMessage)
}