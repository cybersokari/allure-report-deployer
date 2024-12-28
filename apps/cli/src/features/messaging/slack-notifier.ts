import {Notifier} from "../../interfaces/notifier.interface.js";
import {NotificationData} from "../../models/notification.model.js";
import {appLog} from "../../utilities/util.js";
import {ArgsInterface} from "../../interfaces/args.interface.js";
import {SlackInterface} from "../../interfaces/slack.interface.js";

export class SlackNotifier implements Notifier {
    private readonly slackClient: SlackInterface;
    args: ArgsInterface;

    constructor(client: SlackInterface, args: ArgsInterface) {
        this.slackClient = client;
        this.args = args;
    }

    async notify(data: NotificationData): Promise<void> {
        // See: https://api.slack.com/methods/chat.postMessage
        const blocks = []
        blocks.push({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Your Allure report is ready* 📊"
            }
        })
        blocks.push({
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": `:white_check_mark:  *Passed:* ${data.resultStatus.passed}`,
                    }
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": `:warning:  *Broken:* ${data.resultStatus.broken}`
                    }
                ]
            },)
        if (data.reportUrl) {
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
                        "url": data.reportUrl
                    }
                ]
            })
        }
        if (data.storageUrl) {
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
                        "url": data.storageUrl
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
                    "url": "https://github.com/cybersokari/allure-report-deployer"
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
            console.log('Slack error: ', e)
        }
    }

}

