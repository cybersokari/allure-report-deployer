import {Command} from "commander";
import {getSavedCredentialDirectory, getUserAppDirectory, readJsonFile} from "../utilities/file-util.js";
import fs from 'fs/promises'
import chalk from "chalk";
import {KEY_PROJECT_ID} from "../utilities/constants.js";
import {db} from "../utilities/database.js";


export function addCredentialsCommand(defaultProgram: Command) {
    defaultProgram.command('gcp-json:set <json-path>')
        .description("Set Firebase/GCP credentials for future use")
        .action(async (jsonPath) => {
            const credPath = (await getUserAppDirectory()).concat('/key.json');
            await fs.cp(jsonPath, credPath, {force: true})
            const credentialString = await readJsonFile(jsonPath);
            db.set(KEY_PROJECT_ID, credentialString.project_id)
            console.log(`Credential set for project ${chalk.blue(credentialString.project_id)}`);
            process.exit(0);
        })
    defaultProgram.command('gcp-json')
        .description('Print the current path of your Firebase/GCP credentials')
        .action(async () => {
            const credPath = await getSavedCredentialDirectory()
            if(credPath){
                console.log(`Firebase/GCP credentials JSON path: ${chalk.blue(credPath)}`)
            }else {
                console.warn(`No credentials found. Use the ${chalk.cyan('gcp-json:set')} command to set your Firebase/GCP credentials.`);
            }
            process.exit(0);
        })
}


