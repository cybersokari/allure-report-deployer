import {CommandRunner} from "../../src/interfaces/command.interface";

export class FakeAllureService implements CommandRunner{
    runCommand(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
        return Promise.resolve({exitCode: 0, stderr: "", stdout: ""});
    }

}