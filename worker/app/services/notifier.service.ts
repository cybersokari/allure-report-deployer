import {Notifier} from "../interfaces/notifier.interface.js";
import {NotificationData} from "../models/notification.model.js";

export class NotifierService {
    private notifiers: Notifier[];

    constructor(notifiers: Notifier[]) {
        this.notifiers = notifiers;
    }

    async sendNotifications(data: NotificationData): Promise<void> {
        const promises = this.notifiers.map((notifier) => notifier.notify(data));
        await Promise.all(promises);
    }
}