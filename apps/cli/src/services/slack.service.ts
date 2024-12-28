import {SlackInterface} from "../interfaces/slack.interface.js";
import {Block, KnownBlock, WebClient} from "@slack/web-api";

export class SlackService implements SlackInterface {
    private webClient: WebClient;
    private readonly channel: string;

    constructor(token: string, channel: string) {
        this.webClient = new WebClient(token);
        this.channel = channel;
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