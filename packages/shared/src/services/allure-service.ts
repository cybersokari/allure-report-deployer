import {AllureCommandRunner} from "../interfaces/allure-command.interface.js";
// @ts-ignore
import allureCommandline from "allure-commandline"

export class AllureService implements AllureCommandRunner {
    runCommand(args: string[]): Promise<number> {
        const allureProcess = allureCommandline(args);
        return new Promise((resolve) => {
            allureProcess.on("exit", (exitCode: number) => {
                resolve(exitCode);
            });
        });
    }
}