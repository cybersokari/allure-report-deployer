import { CommandRunner } from "../interfaces/command.interface.js";
// @ts-ignore
import allureCommandline from "allure-commandline";

export class AllureService implements CommandRunner {
    runCommand(args: string[]): Promise<{ exitCode: number, stdout: string, stderr: string }> {
        const allureProcess = allureCommandline(args);

        let stdout = '';
        let stderr = '';

        return new Promise((resolve, reject) => {
            allureProcess.stdout?.on('data', (data: any) => {
                stdout += data.toString();
            });

            allureProcess.stderr?.on('data', (data: any) => {
                stderr += data.toString();
            });

            allureProcess.on('error', (error: any) => {
                reject(error);
            });

            allureProcess.on('exit', (exitCode: number) => {
                resolve({ exitCode, stdout, stderr });
            });
        });
    }
}