export interface GithubInterface {
    summaryPath: string;
    outputPath: string;

    updateOutput(message: string): Promise<void>;

    updateSummary(message: string): Promise<void>;

    updatePr({message, token}: { message: string, token: string }): Promise<void>;
}