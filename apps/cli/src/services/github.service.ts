import {GithubConfig, GithubInterface} from "../interfaces/github.interface.js";
import fs from "fs/promises";
import github from "@actions/github";
export class GitHubService implements GithubInterface {

    constructor(readonly config: GithubConfig) {}

    async updateOutput(message: string): Promise<void> {
        try {
            await fs.writeFile(this.config.OUTPUT_PATH, message, {flag: 'a'}); // Append to the file
        } catch (e) {
            console.warn(`Failed to write to ${this.config.OUTPUT_PATH}`, e);
        }
    }

    async updatePr({message, token}: { message: string, token: string }): Promise<void> {

        try {
            const pr = github.context.payload.pull_request!
            const octokit = github.getOctokit(token)
            // Update the PR body
            await octokit.rest.issues.createComment({
                owner: this.config.OWNER,
                repo: this.config.REPO,
                issue_number: pr.number,
                body: message.trim(),
            });
            console.log(`Pull Request #${pr.number} updated successfully!`);
        } catch (e) {
            console.warn('Failed to update PR:', e);
        }
    }

    async updateSummary(message: string): Promise<void> {
        try {
            await fs.writeFile(this.config.STEP_SUMMARY_PATH, message.trim(), {flag: 'a'}); // Append to the file
        } catch (err) {
            console.warn(`Failed to write to ${this.config.STEP_SUMMARY_PATH}`, err);
        }
    }
}