import { CommandRunner } from "../interfaces/command.interface.js";
import * as child_process from "node:child_process";
const exec = child_process.exec;
export class AllureV3Service implements CommandRunner {
    runCommand(args: string[]): Promise<{ exitCode: number, stdout: string, stderr: string }> {
        return new Promise((resolve, reject) => {
            exec(args.join(' '), (err, stdout, stderr) => {
                resolve({ exitCode: err !== null ? 1: 0, stdout, stderr })
            })
        });
    }
}