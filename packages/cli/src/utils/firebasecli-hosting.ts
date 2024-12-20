import {HostingProvider} from "allure-deployer-shared";
// @ts-ignore
import firebase from 'firebase-tools'
import path from "node:path";

export class FirebaseCLIHosting implements HostingProvider {
    constructor(readonly reportDir: string, readonly projectId: string) {
    }
    deploy(): Promise<string|undefined> {
        return new Promise<any>(async (resolve, reject) => {

            firebase.hosting.channel.deploy('news', {
                config: path.join(this.reportDir, 'firebase.json'),
                project: this.projectId,
                'no-authorized-domains': '',
            }).then((data: any) => {
                const url: string | undefined = data[this.projectId]?.url;
                resolve(url)
            }).catch((err: any) => {
                console.error('Failed to deploy report to Firebase hosting', err);
                resolve(undefined)
            });


        })
    }

    init(): Promise<boolean> {
        return Promise.resolve(true);
    }

}