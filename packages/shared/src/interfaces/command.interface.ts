export interface CommandRunner {
    runCommand(args: string[]): Promise<{ exitCode: number, stdout: string, stderr: string }>
}