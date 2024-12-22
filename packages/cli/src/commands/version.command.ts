import {Command} from "commander";
// ./version-update.js updates this on prepublish
export const version = "1.0.0";
export function addVersionCommand(defaultProgram: Command) {
    defaultProgram.version(version).description('Allure Deployer CLI');
}