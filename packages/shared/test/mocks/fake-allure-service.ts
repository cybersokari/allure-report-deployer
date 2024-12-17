import {AllureCommandRunner} from "../../src/interfaces/allure-command.interface";

export class FakeAllureService implements AllureCommandRunner{
    runCommand(args: string[]): Promise<number> {
        return Promise.resolve(0);
    }
}