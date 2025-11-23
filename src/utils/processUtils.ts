import path from "path";
import fs from "fs"

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export enum EnviornmentVariableNames {
    DISCORD_TOKEN_ENV_VAR_NAME = "DISCORD_TOKEN",
    APP_ID_ENV_VAR_NAME = "APP_ID",
    BOT_OWNER_ENV_VAR_NAME = "BOT_OWNER",
    DM_BOT_OWNER_ON_ARCHIVE_FAILURE_ENV_VAR_NAME = "DM_BOT_OWNER_ON_ARCHIVE_FAILURE" 
}

export function getEnviornmentVariable(key: EnviornmentVariableNames): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Could not retrieve enviornment variable for ${key}`);
    }
    return value;
}

export function isDMBotOwnerOnArchiveFailureEnabled() {
    if (getEnviornmentVariable(EnviornmentVariableNames.DM_BOT_OWNER_ON_ARCHIVE_FAILURE_ENV_VAR_NAME) === "true") {
        return true;
    }
    return false;
}

export function getPaywallDomainListPath() {
    return path.join(__dirname, "assets", "paywallDomainList.json");
}

export async function getPaywallDomainListContents(): Promise<string[]> {
    try {
        return JSON.parse(fs.readFileSync(getPaywallDomainListPath(), { encoding: "utf-8" }));
    } catch (err) {
        console.error(`Error reading paywall domain list file: ${err}`);
        throw err;
    };
}

export async function writeToPaywallDomainList(data: string[]) {
    data.sort((a, b) => a.localeCompare(b));
    fs.writeFileSync(getPaywallDomainListPath(), JSON.stringify(data, null, 2) + "\n", "utf-8");
}