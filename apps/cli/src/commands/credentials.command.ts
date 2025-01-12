import {Command} from "commander";
import chalk from "chalk";
import {GoogleCredentialsHelper} from "../utilities/google-credentials-helper.js";


export function addCredentialsCommand(defaultProgram: Command) {
    defaultProgram.command('gcp-json:set <json-path>')
        .description("Set Firebase/GCP credentials for future use")
        .action(async (jsonPath) => {
            const credentialData = await new GoogleCredentialsHelper().save(jsonPath);
            console.log(`Credential set for project ${chalk.blue(credentialData.project_id)}`);
            process.exit(0);
        })
    defaultProgram.command('gcp-json')
        .description('Print the current path of your Firebase/GCP credentials')
        .action(async () => {
            const credPath = await new GoogleCredentialsHelper().directory()
            if(credPath){
                console.log(`Firebase/GCP credentials JSON path: ${chalk.blue(credPath)}`)
            }else {
                console.warn(`No credentials found. Use the ${chalk.cyan('gcp-json:set')} command to set your Firebase/GCP credentials.`);
            }
            process.exit(0);
        })
}


