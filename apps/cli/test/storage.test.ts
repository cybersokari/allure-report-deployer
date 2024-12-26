// @ts-ignore
import mock from "mock-fs";
import * as fs from "fs/promises";
import {jest} from "@jest/globals";
import {Order, StorageProvider} from "../src/interfaces/storage-provider.interface.js";
import {fakeArgs} from "./mocks/fake-args.js";
import {Storage} from '../src/features/storage.js'


// Partially mock the module

// jest.mock("../src/utilities/util.js");

// jest.mock("../src/utilities/counter.js", () => ({
//     counter: {
//         addFilesUploaded: jest.fn(),
//     },
// }));
// jest.mock("p-limit", () => jest.fn(() => jest.fn((fn) => jest.fn())));

// const mockedUtils = jest.mocked(utils);
describe("Storage", () => {
    let storageInstance: Storage;
    const storageProviderMock: jest.Mocked<StorageProvider> = {
        upload: jest.fn<any>(), // Mock upload to resolve with no value
        download: jest.fn<any>().mockResolvedValue([]), // Mock download to resolve with an empty array
        sortFiles: jest.fn<any>().mockImplementation((files: any[], order: Order) => {
            // Example: Mock sorting logic based on Order
            if (order === Order.byOldestToNewest) {
                return files.sort((a: any, b: any) => a.timestamp - b.timestamp);
            }
            if (order === Order.byNewestToOldest) {
                return files.sort((a: any, b: any) => b.timestamp - a.timestamp);
            }
            return files;
        }),
    };
    // Use jest.mocked to get the type-safe mocks

    beforeEach(() => {
        jest.resetModules(); // Clears cached modules
        jest.clearAllMocks(); // C

        storageInstance = new Storage(storageProviderMock, fakeArgs);

        // Mock file system
        mock({
            "/app": {},
        });

    });

    afterEach(() => {
        mock.restore();
        jest.resetModules()
    });

    it("should create staging directories and unzip downloaded files", async () => {

        const file1 = `${fakeArgs.ARCHIVE_DIR}/file1.zp`
        const file2 = `${fakeArgs.ARCHIVE_DIR}/file2.zp`

        storageProviderMock.download.mockResolvedValue([file1, file2]);
        jest.spyOn(storageInstance, "unzipAllureResult").mockResolvedValue(true);

        await storageInstance.stageFilesFromStorage();

        // Check if directories were created
        await expect(fs.stat(fakeArgs.RESULTS_STAGING_PATH)).resolves.toBeDefined();
        await expect(fs.stat(fakeArgs.ARCHIVE_DIR)).resolves.toBeDefined();

        // Check if download and unzip methods were called
        expect(storageProviderMock.download).toHaveBeenCalledWith({
            prefix: "",
            destination: fakeArgs.ARCHIVE_DIR,
        });
        expect(storageInstance.unzipAllureResult).toHaveBeenCalledTimes(2);
        expect(storageInstance.unzipAllureResult).toHaveBeenCalledWith(file1, fakeArgs.RESULTS_STAGING_PATH);
        expect(storageInstance.unzipAllureResult).toHaveBeenCalledWith(file2, fakeArgs.RESULTS_STAGING_PATH);
    });

});