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
    // Use DATA_DIR if provided by orchestrator, otherwise fallback to bundled assets
    const dataDir = process.env.DATA_DIR;
    if (dataDir) {
        return path.join(dataDir, "paywallDomainList.json");
    }
    return path.join(__dirname, "assets", "paywallDomainList.json");
}

function getBundledPaywallDomainListPath() {
    return path.join(__dirname, "assets", "paywallDomainList.json");
}

export async function getPaywallDomainListContents(): Promise<string[]> {
    const targetPath = getPaywallDomainListPath();

    // If using DATA_DIR and file doesn't exist, copy from bundled assets
    if (process.env.DATA_DIR && !fs.existsSync(targetPath)) {
        console.log(`Initializing paywall domain list in DATA_DIR...`);
        const bundledPath = getBundledPaywallDomainListPath();
        if (fs.existsSync(bundledPath)) {
            fs.copyFileSync(bundledPath, targetPath);
            console.log(`Copied default paywall domain list to ${targetPath}`);
        } else {
            // Create empty list if bundled file doesn't exist
            fs.writeFileSync(targetPath, "[]", "utf-8");
            console.log(`Created empty paywall domain list at ${targetPath}`);
        }
    }

    try {
        return JSON.parse(fs.readFileSync(targetPath, { encoding: "utf-8" }));
    } catch (err) {
        console.error(`Error reading paywall domain list file: ${err}`);
        throw err;
    };
}

export async function writeToPaywallDomainList(data: string[]) {
    data.sort((a, b) => a.localeCompare(b));
    fs.writeFileSync(getPaywallDomainListPath(), JSON.stringify(data, null, 2) + "\n", "utf-8");
}