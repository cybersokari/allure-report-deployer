import {Notifier} from "../../interfaces/notifier.interface.js";
import {NotificationData} from "../../models/notification.model.js";
import {Icon} from "../../utilities/icon.js";
import {appLog} from "../../utilities/util.js";
import ansiEscapes from "ansi-escapes";
import chalk from "chalk";
import {ArgsInterface} from "../../interfaces/args.interface.js";

export class ConsoleNotifier implements Notifier {
    args: ArgsInterface;
    constructor(args: ArgsInterface) {
        this.args = args;
        chalk.level = process.env.CI ? 0 : 2
    }
    private isHyperlinkSupported(): boolean {
        // Check for CI environments or non-TTY outputs
        return process.stdout.isTTY && !process.env.CI;
    }
    
    private link(text: string, url: string): string {
        // Use `ansiEscapes.link` if hyperlinks are supported; otherwise, return plain text
        return this.isHyperlinkSupported() ? ansiEscapes.link(text, url) : `${text} (${url})`;
    }
    async notify(data: NotificationData): Promise<void> {
        const dashboardUrl = data.storageUrl
        const reportUrl = data.reportUrl
        chalk.level 

        if (dashboardUrl && reportUrl) {
            appLog(`
${Icon.CHART} Test report URL   : ${this.link(chalk.blue(reportUrl), reportUrl)}
${Icon.FILE_UPLOAD} Storage URL       : ${this.link(chalk.blue(dashboardUrl), dashboardUrl)}
${Icon.SUCCESS} Passed            : ${chalk.yellow(data.resultStatus.passed)}
${Icon.WARNING} Broken            : ${chalk.yellow(data.resultStatus.broken)}
`)
        }

        if (dashboardUrl && !reportUrl) {
            appLog(`
${Icon.FILE_UPLOAD} Storage URL       : ${this.link(chalk.blue(dashboardUrl), dashboardUrl)}
${Icon.SUCCESS} Passed            : ${chalk.yellow(data.resultStatus.passed)}
${Icon.WARNING} Broken            : ${chalk.yellow(data.resultStatus.broken)}
`)
        }

        if (!dashboardUrl && reportUrl) {
            appLog(`
${Icon.CHART} Test report URL   : ${this.link(chalk.blue(reportUrl), reportUrl)}
${Icon.SUCCESS} Passed            : ${chalk.yellow(data.resultStatus.passed)}
${Icon.WARNING} Broken            : ${chalk.yellow(data.resultStatus.broken)}
`)
        }
    }
}
