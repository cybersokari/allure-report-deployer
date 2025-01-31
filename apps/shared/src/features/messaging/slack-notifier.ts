import {Notifier} from "../../interfaces/notifier.interface.js";
import {NotificationData} from "../../models/notification.model.js";
import {appLog} from "../../utilities/util.js";
import {ArgsInterface} from "../../interfaces/args.interface.js";
import {SlackInterface} from "../../interfaces/slack.interface.js";
import {SlackService} from "../../services/slack.service.js";

export class SlackNotifier implements Notifier {
    private readonly slackClient: SlackService;
    args: ArgsInterface;

    constructor(client: SlackInterface, args: ArgsInterface) {
        this.slackClient = client;
        this.args = args;
    }

    private buildStatusBlock(label: string, emoji: string, count: number): any {
        return {
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: `${emoji}  *${label}:* ${count}`,
                },
            ],
        };
    }

    private buildButtonBlock(text: string, url: string): any {
        return {
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text,
                        emoji: true,
                    },
                    url,
                },
            ],
        };
    }

    async notify(data: NotificationData): Promise<void> {
        const blocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Your ${this.args.reportName ?? 'Allure'} report is ready* 📊`,
                },
            },
        ];

        // Add status blocks
        const { resultStatus } = data;
        if (resultStatus.passed) blocks.push(this.buildStatusBlock("Passed", ":white_check_mark:", resultStatus.passed));
        if (resultStatus.broken) blocks.push(this.buildStatusBlock("Broken", ":warning:", resultStatus.broken));
        if (resultStatus.skipped) blocks.push(this.buildStatusBlock("Skipped", ":next_track_button:", resultStatus.skipped));
        if (resultStatus.failed) blocks.push(this.buildStatusBlock("Failed", ":x:", resultStatus.failed));
        if (resultStatus.unknown) blocks.push(this.buildStatusBlock("Unknown", ":question:", resultStatus.unknown));

        // Add report and storage buttons
        if (data.reportUrl) blocks.push(this.buildButtonBlock("View report", data.reportUrl));
        // if (data.storageUrl) blocks.push(this.buildButtonBlock("View files in storage", data.storageUrl));

        // Add GitHub promotion button
        blocks.push(this.buildButtonBlock("Give us a GitHub :star:", "https://github.com/cybersokari/allure-report-deployer"));

        try {
            await this.slackClient.postMessage(blocks, 'Your test report is ready.');
            appLog('Slack message sent');
        } catch (error) {
            console.error('Error sending Slack message:', error);
        }
    }
}