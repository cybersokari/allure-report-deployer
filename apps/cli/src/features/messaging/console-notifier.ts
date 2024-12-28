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
    }
    async notify(data: NotificationData): Promise<void> {
        const dashboardUrl = data.storageUrl
        const reportUrl = data.reportUrl

        if (dashboardUrl && reportUrl) {
            appLog(`
${Icon.CHART} Test report URL   : ${ansiEscapes.link(chalk.blue(reportUrl), reportUrl)}
${Icon.FILE_UPLOAD} Storage URL       : ${ansiEscapes.link(chalk.blue(dashboardUrl), dashboardUrl)}
${Icon.SUCCESS} Passed            : ${chalk.yellow(data.resultStatus.passed)}
${Icon.WARNING} Broken            : ${chalk.yellow(data.resultStatus.broken)}
`)
        }

        if (dashboardUrl && !reportUrl) {
            appLog(`
${Icon.FILE_UPLOAD} Storage URL       : ${ansiEscapes.link(chalk.blue(dashboardUrl), dashboardUrl)}
${Icon.SUCCESS} Passed            : ${chalk.yellow(data.resultStatus.passed)}
${Icon.WARNING} Broken            : ${chalk.yellow(data.resultStatus.broken)}
`)
        }

        if (!dashboardUrl && reportUrl) {
            appLog(`
${Icon.CHART} Test report URL   : ${ansiEscapes.link(chalk.blue(reportUrl), reportUrl)}
${Icon.SUCCESS} Passed            : ${chalk.yellow(data.resultStatus.passed)}
${Icon.WARNING} Broken            : ${chalk.yellow(data.resultStatus.broken)}
`)
        }
    }
}
