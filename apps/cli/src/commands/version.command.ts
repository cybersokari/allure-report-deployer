import {Command} from "commander";
// The ./version-update.cjs file rewrites this file on npm prepublish
export const version = "1.0.0";
export function addVersionCommand(defaultProgram: Command) {
    defaultProgram.version(version).description('Allure Deployer CLI');
}