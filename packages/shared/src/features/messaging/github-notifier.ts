import {Notifier} from "../../interfaces/notifier.interface.js";
import {NotificationData} from "../../models/notification.model.js";
import fs from "node:fs";

export class GitHubNotifier implements Notifier {
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

        if (data.counter) {
            markdown += `
| 📂 **Files Uploaded** | 🔍 **Files Processed** | ⏱ **Duration**     |
|------------------------|------------------------|--------------------|
| ${data.counter.uploaded}       | ${data.counter.processed}      | ${data.counter.getElapsedSeconds()} seconds |
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