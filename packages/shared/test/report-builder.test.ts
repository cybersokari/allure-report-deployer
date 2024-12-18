import {Allure} from "../src";
import {AllureService} from "../src";
// @ts-ignore
import mock from "mock-fs";
import * as fs from "fs/promises";
import {fakeArgs} from "./mocks/fake-args.js";
import {jest} from "@jest/globals";

const REPORTS_DIR = '/app/allure-reports';


jest.mock("../src/utilities/util", () => ({
    appLog: jest.fn(), // Mock the appLog function
}));
jest.mock("../src/utilities/counter", () => ({
    addFilesProcessed: jest.fn().mockImplementation(() => {
    }), // Mock the addFilesProcessed function
}));
jest.mock("fs/promises", () => ({
    lstat: jest.fn(),
    readdir: jest.fn(),
    cp: jest.fn(),
}));


describe("ReportBuilder", () => {
    let mockAllureService: AllureService | null = null;
    let reportBuilder: Allure;
    const allureCommandSuccess = (s: string[]) => {
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' })
    }
    const allureCommandFail = (s: string[]) => {
        return Promise.resolve({ exitCode: 1, stdout: '', stderr: '' })
    }

    afterEach(() => {
        mock.restore();
        jest.clearAllMocks(); // Clear mocks between tests
        mockAllureService = null
    });

    test("open should call allureRunner with correct arguments", async () => {// Mock a successful run
        mockAllureService = {
            runCommand: jest.fn(allureCommandSuccess),
        };
        reportBuilder = new Allure({allureRunner: mockAllureService, args: fakeArgs});
        try {
            await reportBuilder.open();
        } catch (e) {

        }
        expect(mockAllureService.runCommand).toHaveBeenCalledWith([
            "open",
            REPORTS_DIR,
            "--port",
            "8090",
        ]);
    });

    test("generate should throw error if allure command fails", async () => {
        mockAllureService = {
            runCommand: jest.fn(allureCommandFail), // Mock the AllureCommandRunner interface
        };
        reportBuilder = new Allure({allureRunner: mockAllureService, args: fakeArgs});

        await expect(reportBuilder.generate()).rejects.toThrow("Failed to generate Allure report");
    });

    test("stageFilesFromMount should stage files correctly", async () => {
        const dest = fakeArgs.RESULTS_STAGING_PATH;
        mock({
            '/allure-results': {
                'file1.json': '{}',
                'file2.log': 'content2',
            },
            dest: {}
        });
        mockAllureService = {
            runCommand: jest.fn(allureCommandFail), // Mock the AllureCommandRunner interface
        };
        reportBuilder = new Allure({allureRunner: mockAllureService, args: fakeArgs});

        await reportBuilder.stageFilesFromMount();

        const files = await fs.readdir(dest);
        expect(files).toEqual(['file1.json', 'file2.log']);
    });

    test("generate should return report directory path on success", async () => {
        mockAllureService = {
            runCommand: jest.fn(allureCommandSuccess), // Mock the AllureCommandRunner interface
        };
        reportBuilder = new Allure({allureRunner: mockAllureService, args: fakeArgs});
        const result = await reportBuilder.generate();

        expect(result).toBe(REPORTS_DIR);
        expect(mockAllureService.runCommand).toHaveBeenCalledWith([
            "generate",
            fakeArgs.RESULTS_STAGING_PATH,
            "--report-dir",
            REPORTS_DIR,
            "--clean",
        ]);
    });

});