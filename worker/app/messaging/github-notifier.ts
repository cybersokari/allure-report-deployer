import {Notifier} from "./notifier.interface";
import {NotificationData} from "./notification.model";
import counter from "../counter";
import fs from "node:fs";

class GitHubNotifier implements Notifier {
    private readonly summaryPath: string;

    constructor(summaryPath: string) {
        this.summaryPath = summaryPath;
    }

    async notify(data: NotificationData): Promise<void> {

        let markdown = "### 📊 Your Test Report is ready\n\n";

        if (data.reportUrl) {
            markdown += `- **Test Report**: [${data.reportUrl}](${data.reportUrl})\n`;
        }

        if (data.storageUrl) {
            markdown += `- **File Storage**: [${data.storageUrl}](${data.storageUrl})\n`;
        }

        if (counter) {
            markdown += `
| 📂 **Files Uploaded** | 🔍 **Files Processed** | ⏱ **Duration**     |
|------------------------|------------------------|--------------------|
| ${counter.filesUploaded}       | ${counter.filesProcessed}      | ${counter.getElapsedSeconds()} seconds |
    `;
        }

        markdown += `\n\n⭐ Like this? [Star us on GitHub](https://github.com/cybersokari/allure-report-deployer)!`;


        try {
            fs.writeFileSync(this.summaryPath, markdown.trim(), {flag: 'a'}); // Append to the file
        } catch (err) {
            console.warn('Failed to write to $GITHUB_STEP_SUMMARY:', err);
        }
    }
}

const GITHUB_SUMMARY_PATH = process.env.GITHUB_STEP_SUMMARY || null
export let githubNotifier: GitHubNotifier | undefined;
if(GITHUB_SUMMARY_PATH){
    githubNotifier = new GitHubNotifier(GITHUB_SUMMARY_PATH)
}