import {GithubInterface} from "../interfaces/github.interface.js";
import fs from "fs/promises";
import github from "@actions/github";
import process from "node:process";

export class GitHubService implements GithubInterface {
    outputPath: string;
    summaryPath: string;

    constructor({outputPath, summaryPath}: { readonly outputPath: string, readonly summaryPath: string }) {
        this.outputPath = outputPath;
        this.summaryPath = summaryPath;
    }

    async updateOutput(message: string): Promise<void> {
        try {
            await fs.writeFile(this.outputPath, message, {flag: 'a'}); // Append to the file
        } catch (e) {
            console.warn(`Failed to write to ${this.outputPath}`, e);
        }
    }

    async updatePr({message, token}: { message: string, token: string }): Promise<void> {

        try {
            const [owner, repo]  = process.env.GITHUB_REPOSITORY!.split('/')
            const pr = github.context.payload.pull_request!
            const octokit = github.getOctokit(token)
            // Update the PR body
            await octokit.rest.issues.createComment({
                owner,
                repo,
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
            await fs.writeFile(this.summaryPath, message.trim(), {flag: 'a'}); // Append to the file
        } catch (err) {
            console.warn(`Failed to write to ${this.summaryPath}`, err);
        }
    }
}