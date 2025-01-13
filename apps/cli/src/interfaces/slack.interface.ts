export interface SlackInterface {
    webClient: any;
    channel: string;
    postMessage(blocks: (any)[], text: string): Promise<void>;
}
export interface SlackConfig{
    token: string;
    channel: string;
}