import {NotificationData} from "../models/notification.model.js";
import {Notifier} from "../interfaces/notifier.interface.js";

export class NotifyHandler {
    private notifiers: Notifier[];

    constructor(notifiers: Notifier[]) {
        this.notifiers = notifiers;
    }

    async sendNotifications(data: NotificationData): Promise<void> {
        const promises = this.notifiers.map((notifier) => {
            try {
                notifier.notify(data)
            } catch (e) {
                console.warn(`${notifier.constructor.name} failed to send notification.`, e);
            }
        });
        await Promise.all(promises);
    }
}