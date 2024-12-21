import {Command, Option} from "commander";
import {readJsonFile} from "../utils/file-util.js";


export function addVersionCommand(defaultProgram: Command) {
    defaultProgram
        .addOption(new Option("-V, --version", "output the version number"))
        .description("Allure Deployer CLI")

    defaultProgram.hook("preAction", async (thisCommand) => {
        if (thisCommand.opts().version) {
            const packageJson = await readJsonFile("package.json");
            console.log(packageJson.version || "1.0.0");
            process.exit(0);
        }
    });
}