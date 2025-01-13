export interface GithubInterface {
    config: GithubConfig;
    updateOutput(message: string): Promise<void>;
    updateSummary(message: string): Promise<void>;
    updatePr({message, token}: { message: string, token: string }): Promise<void>;
}

export type GithubConfig = {
    RUN_ID: string;
    TOKEN?: string;
    OWNER: string;
    REPO: string;
    STEP_SUMMARY_PATH: string;
    OUTPUT_PATH: string;
}