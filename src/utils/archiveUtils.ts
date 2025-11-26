import archiveToday from "archivetoday"
import { getPaywallDomainListContents } from ".";
const MAX_AMOUNT_OF_URLS_TO_EXTRACT = 3;

// Helper function to get the URLs out of a message. Making it its own function to be used in its message listener flow or for direct command invocation
export function extractURLs(messageContent: string) {
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const urls = messageContent.match(urlRegex) || [];
    return urls;
}

export async function extractPaywallDomainURLs(messageContent: string) {
    const paywallDomainList = await getPaywallDomainListContents();

    // Find any URLs in the message. We'll check against the domain list afterword
    const extractedURLs = extractURLs(messageContent);
    //console.log(extractedURLs)
    const paywallDomainMatchedURLs = [];

    // Putting an upper-bound of 3 on this so that certain people don't abuse our calls to the archive repo
    for (let i =0; i < Math.min(extractedURLs.length, MAX_AMOUNT_OF_URLS_TO_EXTRACT); i++) {
        const url = extractedURLs[i];
        try {
            const { hostname, origin, pathname } = new URL(url); // www.bloomberg.com
            const parts = hostname.split("."); // [www, bloomberg, com]
            const baseDomain = parts[parts.length - 2].toLowerCase(); // bloomberg
            if (paywallDomainList.includes(baseDomain)) {
                // URL contains a domain in our paywall domain list
                // Remove the queryParams before adding to the returned list
                const urlWithoutQueryParams = origin + pathname;
                console.log(`Adding ${urlWithoutQueryParams}`)
                paywallDomainMatchedURLs.push(urlWithoutQueryParams);
            }
        } catch (e) {
            // Skip any URLs where the `new URL` call fails
            continue;
        }
    }

    return paywallDomainMatchedURLs;
}

export async function getLatestArchivedURL(url: string) {
    // Returns an array of {url: string, timestamp: Date}
    const timestamps = await archiveToday.timemap({url});
    if (timestamps.length) {
        const result = timestamps[timestamps.length - 1];
        console.log(`Successfully retrieved archived link for provided url: ${url}`, {
            archivedURL: result
        })
        return result;
    }
    return undefined;
}

export function generateReplyMessageWithArchivedURLs(archivedURLs: string[]) {
    if (!archivedURLs.length) {
        return;
    }

    if (archivedURLs.length === 1) {
        return `We found an archived link for the paywalled URL you included at ${archivedURLs[0]}`
    }

    const multiLineHeader = `We found archived links for the paywalled URLs you included at: \n`;
    const multiLineBody = archivedURLs.map((url: string) => {
        return `* ${url}`
    }).join(`\n`);
    return `${multiLineHeader} ${multiLineBody}`;
}

// For the add/remove paywall domain commands
export function validateDomainInput(input: string): string | undefined {
    const trimmed = input.trim().toLowerCase();

    // reject if contains a dot or slash (full domains or URLs)
    if (trimmed.includes(".") || trimmed.includes("/") ) {
        return undefined;
    }

    // allowlist allowed characters
    if (!/^[a-z0-9-]{2,50}$/.test(trimmed)) {
        return undefined;
    }

    return trimmed;
}