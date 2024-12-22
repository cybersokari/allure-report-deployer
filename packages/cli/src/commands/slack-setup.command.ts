import {Command} from "commander";
import {db} from "../utils/database.js";
import {KEY_SLACK, KEY_SLACK_CHANNEL, KEY_SLACK_TOKEN} from "../utils/constants.js";
import chalk from "chalk";


export function addSlackTokenCommand(defaultCommand: Command) {
    defaultCommand.command('slack:set <channel> <token>')
        .description('Set Slack channel and token')
        .action(async (channel, token,) => {
            const data = {token: token, channel: channel};
            db.set(KEY_SLACK, data);
            console.log(`Slack credentials updated successfully.`);
        })
    defaultCommand.command('slack').description('Output your slack channel and token')
        .action(()=> {
            if(db.has(KEY_SLACK)){
                console.log(`Slack channel: ${chalk.blue(db.get(KEY_SLACK_CHANNEL))}`)
                console.log(`Slack token: ${chalk.blue(db.get(KEY_SLACK_TOKEN))}`)
                process.exit(0);
            }
            console.log(`No slack credentials. Use ${chalk.cyan('slack:set')} command to set your slack channel and token`)
        })
}