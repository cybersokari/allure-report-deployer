import {Counter} from "../utilities/counter.js";

export class NotificationData {
    constructor(
        public readonly counter: Counter,
        public readonly reportUrl?: string,
        public readonly storageUrl?: string
    ) {}
}