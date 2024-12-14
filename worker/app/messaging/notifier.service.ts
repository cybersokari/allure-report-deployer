import {Notifier} from "./notifier.interface";
import {NotificationData} from "./notification.model";

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