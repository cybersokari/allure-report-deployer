import {Counter} from "../counter";

export class NotificationData {
    constructor(
        public readonly counter: Counter,
        public readonly reportUrl?: string,
        public readonly storageUrl?: string
    ) {}
}