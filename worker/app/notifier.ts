import counter from "./counter";
import {cloudStorage, keepHistory, keepRetires, STORAGE_BUCKET, websiteId} from "../index";
import {WebClient} from '@slack/web-api';
import {StringBuilder} from "./string-builder";
import {getProjectIdFromCredentialsFile} from "./util";
import * as fs from "node:fs";

type SlackCredentials = {
    token: string,
    conversationId: string,
    url?: string | undefined | null
}

class Notifier {
    private lineBreak = '</br>'

    public async SendSlackMsg(cred: SlackCredentials) {
        const web = new WebClient(cred.token);
        // See: https://api.slack.com/methods/chat.postMessage

        const blocks = []
        blocks.push({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Your Allure report is ready* :female-teacher:"
            }
        })
        if (cloudStorage) {

            blocks.push({
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": ":file_folder:  *Files uploaded:* 54"
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": ":mag:  *Files processed:* 49"
                        }
                    ]
                },)
        }
        blocks.push({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": ":stopwatch:  *Duration:* 11.206 seconds"
                }
            ]
        })
        if (cred.url) {
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
                        "url": cred.url
                    }
                ]
            })
        }
        if(cloudStorage){
            const projectId = await getProjectIdFromCredentialsFile()
            const firebaseDashboardUrl = `https://console.firebase.google.com/project/${projectId}/storage/${STORAGE_BUCKET}/files`
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
                        "url": firebaseDashboardUrl
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

        const result = await web.chat.postMessage({
            channel: cred.conversationId,
            blocks: blocks,
            text: 'Your Allure report is ready.'
        });

        console.log('Message sent: ', result.ts);
    }

    public async printGithubSummary(data: { mountedFilePath: string, url: string | undefined }): Promise<void> {
        const builder = new StringBuilder()
        builder.append(`**Your report is ready :female-teacher:** ${data.url}`)
            .append(this.lineBreak).append(this.lineBreak)
        if (data.url) {
            builder.append(`**[View report](${data.url})**`)
                .append(this.lineBreak).append(this.lineBreak)
        }
        if (cloudStorage) {
            const projectId = await getProjectIdFromCredentialsFile()
            const firebaseDashboardUrl = `https://console.firebase.google.com/project/${projectId}/storage/${STORAGE_BUCKET}/files`
            builder.append(`**[View files](${firebaseDashboardUrl})**`)
                .append(this.lineBreak).append(this.lineBreak)

            builder.append(`📂 Files uploaded: ${counter.filesUploaded}`)
                .append(this.lineBreak).append(this.lineBreak)
                .append(`🔍 Files processed: ${counter.filesProcessed}`)
                .append(this.lineBreak).append(this.lineBreak)
        }
        builder
            .append(`**⏱️ Duration: ${counter.getElapsedSeconds()} seconds**`)
        try {
            fs.writeFileSync(data.mountedFilePath, builder.toString(), {flag: 'a'}); // Append to the file
        } catch (err) {
            console.warn('Failed to write to $GITHUB_STEP_SUMMARY:', err);
        }
    }

    public printStats() {
        if (!websiteId) {
            console.log('Report publishing disabled because WEBSITE_ID is not provided');
        }
        if (cloudStorage) {
            if (keepHistory && keepRetires) {
                console.log(`KEEP_HISTORY and KEEP_RETRIES enabled`)
            } else if (!keepHistory && !keepRetires) {
                console.log(`KEEP_HISTORY and KEEP_RETRIES disabled`)
            } else if (keepHistory) {
                console.log(`KEEP_HISTORY enabled`)
            } else if (keepRetires) {
                console.log(`KEEP_RETRIES enabled`)
            }
        } else {
            console.log('STORAGE_BUCKET is not provided, KEEP_HISTORY and KEEP_RETRIES disabled');
        }
    }
}

export default new Notifier();