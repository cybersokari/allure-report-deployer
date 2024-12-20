import {Command} from "commander";
import {db} from "../main.js";
import chalk from "chalk";
import {getSavedCredentialDirectory} from "../utils/file-util.js";
import {readFile} from "fs/promises";
import {GCPStorage} from "allure-deployer-shared";

export function addStorageBucketCommand(defaultProgram: Command) {
    defaultProgram.command('bucket:set <bucket-name>')
        .description("Set Firebase/GCP storage bucket for future use")
        .action(async (bucketName: string) => {
            const creds = await getSavedCredentialDirectory()
            if(!creds){
                console.error("You must set your Firebase/GCP credential JSON first: Use set-gcp-json")
                process.exit(1)
            }

            try {
                const gcpJson = JSON.parse(await readFile(creds, "utf-8"));
                new GCPStorage({credentials: gcpJson}).bucket(bucketName)
                db.set('bucket', bucketName);
                console.log(`Storage bucket set to: ${chalk.cyan(bucketName)}`);
            }catch(err) {
                //TODO: Remove this error from log
                console.error('Failed to set bucket: ', err)
                process.exit(1)
            }
        })
    defaultProgram.command('bucket')
        .description('Print your current storage bucket')
        .action(async () => {
        const bucketName = db.get('bucket')
        if(bucketName){
            console.log(`Firebase/GCP bucket: ${chalk.yellow(bucketName)}`)
        } else {
            console.log('bucket not set. Use the bucket:set argument to set storage bucket')
        }
    })
}