import counter from "./counter";
import {DEBUG, Icon, keepHistory, keepResults, STORAGE_BUCKET, websiteId} from "./constant";
import {WebClient} from '@slack/web-api';
import {StringBuilder} from "./string-builder";
import * as fs from "node:fs";
import ansiEscapes from "ansi-escapes";
import chalk from "chalk";
import credential from "./credential";
import {appLog, createGitHubMarkdown} from "./util";

type SlackCredentials = {
    channel: string,
    token: string,
}

export interface SlackClient {
    postMessage(blocks: any, text: string): Promise<void>;
}

export class RealSlackClient implements SlackClient {
    private webClient: WebClient;
    private readonly channel: string;

    constructor(cred: SlackCredentials) {
        this.webClient = new WebClient(cred.token);
        this.channel = cred.channel;
    }

    public async postMessage(blocks: any, text: string): Promise<void> {
        const channel = this.channel;
        await this.webClient.chat.postMessage({
            channel,
            blocks,
            text,
        });
    }
}

/**
 * Notifier Class
 *
 * Handles notifications related to report generation and file processing.
 * Supports Slack notifications, GitHub summary updates, and general stats logging.
 */
class Notifier {
    public slackClient?: SlackClient;

    constructor(slackClient?: SlackClient) {
        this.slackClient = slackClient;
    }

    private get dashboardUrl() {
        if (DEBUG) {
            return `http://127.0.0.1:4000/storage/${STORAGE_BUCKET}`
        }
        return new StringBuilder()
            .append("https://console.firebase.google.com/project")
            .append(`/${(credential.projectId)}`)
            .append(`/storage/${STORAGE_BUCKET}/files`)
            .toString()
    }

    /**
     * Sends a message to a Slack channel with details about the report.
     * Includes report links, file processing stats, and additional buttons.
     */
    public async SendSlackMsg(url?: string | null) {
        if (!this.slackClient) throw new Error('Slack client not initialized')
        // See: https://api.slack.com/methods/chat.postMessage

        const blocks = []
        blocks.push({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Your Allure report is ready* 📊"
            }
        })
        if (STORAGE_BUCKET) {

            blocks.push({
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": `:file_folder:  *Files uploaded:* ${counter.filesUploaded}`
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": `:mag:  *Files processed:* ${counter.filesProcessed}`
                        }
                    ]
                },)
        }
        blocks.push({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": `:stopwatch:  *Duration:* ${counter.getElapsedSeconds()} seconds`
                }
            ]
        })
        if (url) {
            blocks.push({
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "View report",
                            "emoji": true
                        },
                        "url": url
                    }
                ]
            })
        }
        if (STORAGE_BUCKET) {
            blocks.push({
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "View files in storage",
                            "emoji": true
                        },
                        "url": this.dashboardUrl
                    }
                ]
            })
        }
        blocks.push({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Star us on GitHub :smile:",
                        "emoji": true
                    },
                    "url": "https://github.com/cybersokari/allure-docker-deploy"
                }
            ]
        })

        try {
            await this.slackClient.postMessage(
                blocks,
                'Your Allure report is ready.'
            );
            appLog('Slack message sent');
        } catch (e) {

        }
    }

    /**
     * Prints a summary of the report to GitHub actions Summary.
     * Includes the report link, processing stats, and duration.
     * @param data - Contains the report URL and file path for summary
     */
    public async printGithubSummary({mountedFilePath, url}: { mountedFilePath: string, url?: string | null }): Promise<void> {
        const gitHubSum = createGitHubMarkdown({testReportUrl: url, counter: counter, fileStorageUrl: this.dashboardUrl})
        try {
            fs.writeFileSync(mountedFilePath, gitHubSum, {flag: 'a'}); // Append to the file
        } catch (err) {
            console.warn('Failed to write to $GITHUB_STEP_SUMMARY:', err);
        }
    }

    /**
     * Prints stats about the report generation process, including
     * history retention and retries.
     */
    public printStats() {
        if (!websiteId) {
            appLog('Report publishing disabled because WEBSITE_ID is not provided');
        }
        if (STORAGE_BUCKET) {
            if (keepHistory && keepResults) {
                appLog(`KEEP_HISTORY and KEEP_RESULTS enabled`)
            } else if (keepHistory) {
                appLog(`KEEP_HISTORY enabled`)
            } else if (keepResults) {
                appLog(`KEEP_RESULTS enabled`)
            }
        } else {
            appLog('STORAGE_BUCKET is not provided, KEEP_HISTORY and KEEP_RESULTS disabled')
        }
    }


    printSummaryToConsole(data?: { url?: string | null }): void {
        const dashboardUrl = this.dashboardUrl
        if (STORAGE_BUCKET && data) {
            appLog(`
${Icon.CHART} Test report URL   : ${ansiEscapes.link(chalk.blue(data.url), data!.url!)}
${Icon.FILE_UPLOAD} Storage URL       : ${ansiEscapes.link(chalk.blue(dashboardUrl), dashboardUrl)}
${Icon.FOLDER} Files uploaded    : ${chalk.yellow(counter.filesUploaded)}
${Icon.MAGNIFIER} Files processed   : ${chalk.yellow(counter.filesProcessed)}
`)

        }
        if (STORAGE_BUCKET && !data) {
            appLog(`
${Icon.FILE_UPLOAD} Storage URL       : ${ansiEscapes.link(chalk.blue(dashboardUrl), dashboardUrl)}
${Icon.FOLDER} Files uploaded    : ${chalk.yellow(counter.filesUploaded)}
${Icon.MAGNIFIER} Files processed   : ${chalk.yellow(counter.filesProcessed)}
`)
        }

        if (!STORAGE_BUCKET && data) {
            appLog(`
${Icon.CHART} Test report URL   : ${ansiEscapes.link(chalk.blue(data.url), data!.url!)}
`)
        }

    }

}

const token = process.env.SLACK_TOKEN || null;
const channel = process.env.SLACK_CHANNEL_ID || null;
let notifier: Notifier;
if (token && channel) {
    notifier = new Notifier(new RealSlackClient({token, channel}))
} else {
    notifier = new Notifier()
}
export default notifier


