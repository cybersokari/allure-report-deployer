import { ConsoleNotifier,
    EnvCredential,
    GitHubNotifier,
    RealSlackClient,
    SlackNotifier
} from "@allure/shared";

const GITHUB_SUMMARY_PATH = process.env.GITHUB_STEP_SUMMARY || null
export let githubNotifier: GitHubNotifier | undefined;
if(GITHUB_SUMMARY_PATH){
    githubNotifier = new GitHubNotifier(GITHUB_SUMMARY_PATH)
}


const token = process.env.SLACK_TOKEN || null;
const channel = process.env.SLACK_CHANNEL_ID || null;
export let slackNotifier: SlackNotifier | undefined;
if(token && channel){
    slackNotifier = new SlackNotifier(new RealSlackClient(token, channel))
}

// export const allure = new Allure(new AllureService());
export const credential = EnvCredential.getInstance();
export const consoleNotifier = new ConsoleNotifier()