import {AfterAll, BeforeAll, Given, setDefaultTimeout, When} from "@cucumber/cucumber";
import {GenericContainer, StartedTestContainer} from "testcontainers";
import {main} from "../../index";
let container : StartedTestContainer;
setDefaultTimeout(40 * 1000)
export const defaultBucket = 'fir-demo-project.appspot.com'
BeforeAll(async () => {
    container = await new GenericContainer("goatlab/firebase-emulator:1.2-arm64")
        .withName("firebase-emulator")
        .withExposedPorts({container: 9199, host: 9199}, {container: 4000, host: 4000})
        .withCommand([
            "firebase",
            "emulators:start",
            "--only",
            "storage,logging",
            "--project",
            "fir-demo-project",
            "--config",
            "/app/startfirebase.json",
        ]).start();

    const host = container.getHost();
    const mappedPort9199 = container.getMappedPort(9199);
    const mappedPort4000 = container.getMappedPort(4000);
    console.log(`Firebase emulator is running on:`);
    console.log(`- Storage: http://${host}:${mappedPort9199}`);
    console.log(`- Logging: http://${host}:${mappedPort4000}`);
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199'
})
Given(/^I set a valid Google Credential$/, function () {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = ''
});
Given(/^I set a valid Storage Bucket$/, function () {
    process.env.STORAGE_BUCKET = defaultBucket
});
AfterAll(async () => {
    await container.stop();
})
Given(/^I set keepHistory to (true|false)$/, function (value: string) {
    process.env.KEEP_HISTORY = value
});
When(/^I run the app in CI mode$/, function () {
    main()
});