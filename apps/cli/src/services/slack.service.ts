import {SlackConfig, SlackInterface} from "../interfaces/slack.interface.js";
import {Block, KnownBlock, WebClient} from "@slack/web-api";

export class SlackService implements SlackInterface {
    webClient: WebClient;
    channel: string;

    constructor(config: SlackConfig) {
        this.webClient = new WebClient(config.token);
        this.channel = config.channel;
    }

    public async postMessage(blocks: (Block | KnownBlock )[], text: string): Promise<void> {
        const channel = this.channel;
        await this.webClient.chat.postMessage({
            channel,
            blocks,
            text,
        });
    }
}