import {Block, KnownBlock, WebClient} from "@slack/web-api";
import {Notifier} from "../../interfaces/notifier.interface.js";
import {NotificationData} from "../../models/notification.model.js";
import {appLog} from "../../utilities/util.js";

export interface SlackClient {
    postMessage(blocks: (Block | KnownBlock )[], text: string): Promise<void>;
}

export class RealSlackClient implements SlackClient {
    private webClient: WebClient;
    private readonly channel: string;

    constructor(token: string, channel: string) {
        this.webClient = new WebClient(token);
        this.channel = channel;
    }

    public async postMessage(blocks: (Block | KnownBlock )[], text: string): Promise<void> {
        const channel = this.channel;
        await this.webClient.chat.postMessage({
            channel,
            blocks,
            text,
        });
    }
}


export class SlackNotifier implements Notifier {
    private readonly slackClient: SlackClient;

    constructor(client: SlackClient) {
        this.slackClient = client;
    }

    async notify(data: NotificationData, storageBucket?: string): Promise<void> {

        // See: https://api.slack.com/methods/chat.postMessage

        const blocks = []
        blocks.push({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Your Allure report is ready* 📊"
            }
        })
        if (storageBucket) {

            blocks.push({
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": `:file_folder:  *Files uploaded:* ${data.counter.uploaded}`
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": `:mag:  *Files processed:* ${data.counter.processed}`
                        }
                    ]
                },)
        }
        blocks.push({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": `:stopwatch:  *Duration:* ${data.counter.getElapsedSeconds()} seconds`
                }
            ]
        })
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
        if (storageBucket) {
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
            console.log('Slack error: ', e)
        }
    }

}

