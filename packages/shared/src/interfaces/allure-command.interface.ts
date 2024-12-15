export interface AllureCommandRunner {
    runCommand(args: string[]): Promise<number>;
}