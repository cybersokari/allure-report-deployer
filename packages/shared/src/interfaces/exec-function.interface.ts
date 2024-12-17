export interface ExecResult {
    stdout: string;
    stderr: string;
}
export interface ExecFunction {
    (command: string): Promise<ExecResult>;
}