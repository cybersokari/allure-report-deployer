import {Notifier} from "../../interfaces/notifier.interface.js";
import {NotificationData} from "../../models/notification.model.js";
import {Icon} from "../../utilities/constant.js";
import {appLog} from "../../utilities/util.js";
import ansiEscapes from "ansi-escapes";
import chalk from "chalk";

class ConsoleNotifier implements Notifier {
    async notify(data: NotificationData): Promise<void> {
        const dashboardUrl = data.storageUrl
        const reportUrl = data.reportUrl
        const counter = data.counter

        if (dashboardUrl && reportUrl) {
            appLog(`
${Icon.CHART} Test report URL   : ${ansiEscapes.link(chalk.blue(reportUrl), reportUrl)}
${Icon.FILE_UPLOAD} Storage URL       : ${ansiEscapes.link(chalk.blue(dashboardUrl), dashboardUrl)}
${Icon.FOLDER} Files uploaded    : ${chalk.yellow(counter.filesUploaded)}
${Icon.MAGNIFIER} Files processed   : ${chalk.yellow(counter.filesProcessed)}
`)
        }

        if (dashboardUrl && !reportUrl) {
            appLog(`
${Icon.FILE_UPLOAD} Storage URL       : ${ansiEscapes.link(chalk.blue(dashboardUrl), dashboardUrl)}
${Icon.FOLDER} Files uploaded    : ${chalk.yellow(counter.filesUploaded)}
${Icon.MAGNIFIER} Files processed   : ${chalk.yellow(counter.filesProcessed)}
`)
        }

        if (!dashboardUrl && reportUrl) {
            appLog(`
${Icon.CHART} Test report URL   : ${ansiEscapes.link(chalk.blue(reportUrl), reportUrl)}
`)
        }
    }
}

export default new ConsoleNotifier();