
export interface SlackInterface {
    postMessage(blocks: (any)[], text: string): Promise<void>;
}