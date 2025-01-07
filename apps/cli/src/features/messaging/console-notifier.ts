import {Notifier} from "../../interfaces/notifier.interface.js";
import {NotificationData} from "../../models/notification.model.js";
import {Icon} from "../../utilities/icon.js";
import {appLog} from "../../utilities/util.js";
import ansiEscapes from "ansi-escapes";
import chalk from "chalk";
import {ArgsInterface} from "../../interfaces/args.interface.js";
import { ResultsStatus } from "../../interfaces/counter.interface.js";
import { StringBuilder } from "../../lib.js";

export class ConsoleNotifier implements Notifier {
    args: ArgsInterface;
    constructor(args: ArgsInterface) {
        this.args = args;
    }
    private isHyperlinkSupported(): boolean {
        // Check for CI environments or non-TTY outputs
        return process.stdout.isTTY && !process.env.CI;
    }
    
    private link(text: string, url: string): string {
        // Use `ansiEscapes.link` if hyperlinks are supported; otherwise, return plain text
        return this.isHyperlinkSupported() ? ansiEscapes.link(text, url) : url;
    }

    private writeStatuses(status: ResultsStatus): string{
        const builder = new StringBuilder()
        if(status.passed){
            builder.append(`${Icon.SUCCESS} Passed            : ${chalk.yellow(status.passed)}`).append(`\n`)
        }
        if(status.broken){
            builder.append(`${Icon.WARNING} Broken            : ${chalk.yellow(status.broken)}`).append(`\n`)
        }
        if(status.skipped){
            builder.append(`${Icon.SKIPPED} Skipped           : ${chalk.yellow(status.skipped)}`).append(`\n`)
        }
        if(status.failed){
            builder.append(`${Icon.FAILURE} Failed            : ${chalk.yellow(status.failed)}`).append(`\n`)
        }
        if(status.unknown){
            builder.append(`${Icon.QUESTION_MARK} Unknown           : ${chalk.yellow(status.unknown)}`)
        }
        return builder.toString();
    }

    async notify(data: NotificationData): Promise<void> {
        const dashboardUrl = data.storageUrl
        const reportUrl = data.reportUrl

        if (dashboardUrl && reportUrl) {
            appLog(`
${Icon.CHART} Test report URL   : ${this.link(chalk.blue(reportUrl), reportUrl)}
${Icon.FILE_UPLOAD} Storage URL       : ${this.link(chalk.blue(dashboardUrl), dashboardUrl)}
${this.writeStatuses(data.resultStatus)}
`)
        }

        if (dashboardUrl && !reportUrl) {
            appLog(`
${Icon.FILE_UPLOAD} Storage URL       : ${this.link(chalk.blue(dashboardUrl), dashboardUrl)}
${this.writeStatuses(data.resultStatus)}
`)
        }

        if (!dashboardUrl && reportUrl) {
            appLog(`
${Icon.CHART} Test report URL   : ${this.link(chalk.blue(reportUrl), reportUrl)}
${this.writeStatuses(data.resultStatus)}
`)
        }
    }
}
