import {Notifier} from "../../interfaces/notifier.interface.js";
import {NotificationData} from "../../models/notification.model.js";
import {ArgsInterface} from "../../interfaces/args.interface.js";
import {GithubInterface} from "../../interfaces/github.interface.js";

export class GitHubNotifier implements Notifier {
    args: ArgsInterface;
    client: GithubInterface;

    constructor(client: GithubInterface, args: ArgsInterface) {
        this.client = client;
        this.args = args;
    }

    async notify(data: NotificationData): Promise<void> {

        let markdown = "### 📊 Your Test Report is ready\n\n";

        if (data.reportUrl) {
            markdown += `- **Test Report**: [${data.reportUrl}](${data.reportUrl})\n`;
        }

        if (data.storageUrl) {
            markdown += `- **File Storage**: [${data.storageUrl}](${data.storageUrl})\n`;
        }
        const passed = data.resultStatus.passed;
        const broken = data.resultStatus.broken;
        const skipped = data.resultStatus.skipped;
        const failed = data.resultStatus.failed;
        const unknown = data.resultStatus.unknown;

        markdown += `
| ✅ **Passed** | ⚠️ **Broken** | ⏭️ **Skipped** | ❌ **Failed** | ❓ **Unknown**|
|-----------|------------------|---------------|---------------|---------------|
| ${passed} | ${broken}        | ${skipped}    | ${failed}     | ${unknown}|
    `;
        const promises: Promise<void>[] = [];
        promises.push(this.client.updateOutput(`report_url=${data.reportUrl}`))

        const githubToken = process.env.GITHUB_TOKEN;
        if(githubToken && this.args.updatePr === 'comment'){
            promises.push(this.client.updatePr({message: markdown, token: githubToken}))
        } else {
            promises.push(this.client.updateSummary(markdown.trim()))
        }
        await Promise.all(promises)
    }
}