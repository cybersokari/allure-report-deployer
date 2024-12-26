import {CounterInterface} from "../interfaces/counter.interface.js";

export class NotificationData {
    constructor(
        public readonly counter: CounterInterface,
        public readonly reportUrl?: string,
        public readonly storageUrl?: string
    ) {}
}