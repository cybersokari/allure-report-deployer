import {Argument, Command, Option} from "commander";
import {db} from "../main.js";
import process from "node:process";
import {getRuntimeDirectory, getSavedCredentialDirectory, readJsonFile} from "../utils/file-util.js";
import {CliArguments} from "../utils/cli-arguments.js";
import fs from "fs/promises";
import path from "node:path";


export function addDeployCommand(defaultProgram: Command, onCommand: (args: CliArguments) => Promise<void>) {
    defaultProgram.command('deploy')
        .description('Generate and deploy Allure report')
        .addArgument(new Argument('<allure-results-path>', 'Allure results path')
            .default('./allure-results', 'Default ./allure-results directory').argOptional())
        .addArgument(new Argument('<website-id>', 'The unique identifier for this report').
        argOptional().default('allure-report', 'Default website-id'))
        .addOption(
            new Option('-kh, --keep-history', 'Upload history to storage to enable History in next report')
        )
        .addOption(
            new Option('-kr, --keep-results', 'Upload results to storage to enable Retries in next report')
        )
        .addOption(new Option('-r, --show-retries', 'Show retries in report'))
        .addOption(new Option('-h, --show-history', 'Show history in report'))
        .addOption(new Option('--gcp-json <json-path>', 'Path to your Firebase/GCP JSON credential'))
        .addOption(new Option('-b, --bucket <bucket>', 'Firebase/GCP Storage bucket'))
        .action(async (resultPath, websiteId, options) => {

           try {
               const files = await fs.readdir(path.normalize(resultPath));
               if(!files.length){
                   console.error(`Error: ${resultPath} is empty`);
                   process.exit(1)
               }
           }catch (e) {
               console.error(`Error: No allure result files in ${resultPath}`);
               process.exit(1)
           }

            // Check if GCP credentials is set
            let firebaseProjectId : string | undefined ;
            let runtimeCredentialDirectory =  options.gcpJson;
            if(runtimeCredentialDirectory) {
                const json = await readJsonFile(runtimeCredentialDirectory); // throws error on an invalid file
                firebaseProjectId = json.project_id;
                process.env.GOOGLE_APPLICATION_CREDENTIALS = runtimeCredentialDirectory
            } else {
                const savedCredentials = await getSavedCredentialDirectory()
                if(!savedCredentials){
                    console.error(
                        "Error: You must set a Firebase/GCP token using 'gcp-json:set' or provide it with the '--gcp-json' option."
                    );
                    process.exit(1);
                }
                process.env.GOOGLE_APPLICATION_CREDENTIALS = savedCredentials
                runtimeCredentialDirectory = savedCredentials
            }


            if ((!db.get('bucket') && !options.bucket)) {

                if(options.showRetries){
                    console.error(
                        "Error: To show retries, you must set a Firebase/GCP bucket using 'bucket:set' or provide it with the '--bucket' option."
                    );
                    process.exit(1);
                }

                if(options.showHistory){
                    console.error(
                        "Error: To show history, you must set a Firebase/GCP bucket using 'bucket:set' or provide it with the '--bucket' option."
                    );
                    process.exit(1);
                }


                if(options.keepHistory){
                    console.error(
                        "Error: To show back up history, you must set a Firebase/GCP bucket using 'bucket:set' or provide it with the '--bucket' option."
                    );
                    process.exit(1);
                }

                if(options.keepResults){
                    console.error(
                        "Error: To back uo results, you must set a Firebase/GCP bucket using 'bucket:set' or provide it with the '--bucket' option."
                    );
                    process.exit(1);
                }

                if (!websiteId) {
                    console.error('Error: website-id argument or --bucket option is required');
                    process.exit(1)
                }
            }

            const runtimeDir = await getRuntimeDirectory()
            const cliArgs : CliArguments = {
                runtimeCredentialDir: runtimeCredentialDirectory,
                ARCHIVE_DIR: `${runtimeDir}/archive`,
                HOME_DIR: runtimeDir,
                REPORTS_DIR: `${runtimeDir}/allure-report`,
                RESULTS_PATH: resultPath,
                RESULTS_STAGING_PATH: `${runtimeDir}/allure-results`,
                downloadRequired: false,
                fileProcessingConcurrency: 10,
                firebaseProjectId: firebaseProjectId ?? db.get('project_id'),
                uploadRequired: false,
                storageBucket: options.bucket ?? db.get('bucket'),
                keepHistory: options.keepHistory,
                keepResults: options.keepResults,
                showRetries: options.showRetries,
                showHistory: options.showHistory,
                websiteId: websiteId
            }

            await onCommand(cliArgs)
        });
}
