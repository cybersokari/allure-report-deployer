// @ts-ignore
import mock from "mock-fs";
import {jest, expect, test, afterEach, describe} from "@jest/globals";
// @ts-ignore
import {ExecutorInterface} from "../src/interfaces/executor.interface.js";
// @ts-ignore
import {AllureService} from "../src/services/allure.service.js";
// @ts-ignore
import {Allure, AllureConfig} from "../src/features/allure.js";

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

const executor: ExecutorInterface = {
    reportUrl: 'http://localhost',
}

describe("ReportBuilder", () => {
    const config : AllureConfig = {
        RESULTS_STAGING_PATH: '/app/allure-results',
        REPORTS_DIR
    }
    let mockAllureService: AllureService | null = null;
    let reportBuilder: Allure;
    const allureCommandSuccess = (s: string[]) => {
        return Promise.resolve({exitCode: 0, stdout: '', stderr: ''})
    }
    const allureCommandFail = (s: string[]) => {
        return Promise.resolve({exitCode: 1, stdout: '', stderr: ''})
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
        reportBuilder = new Allure({allureRunner: mockAllureService, config});
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
        mock({
            '/app/allure-results': {},
        });
        mockAllureService = {
            runCommand: jest.fn(allureCommandFail), // Mock the AllureCommandRunner interface
        };
        reportBuilder = new Allure({allureRunner: mockAllureService, config});

        await expect(reportBuilder.generate(executor)).rejects.toThrow("Failed to generate Allure report");
    });

    test("generate should return report directory path on success", async () => {
        mock({
            '/app/allure-results': {},
        });
        mockAllureService = {
            runCommand: jest.fn(allureCommandSuccess), // Mock the AllureCommandRunner interface
        };
        reportBuilder = new Allure({allureRunner: mockAllureService, config});
        const result = await reportBuilder.generate(executor);

        expect(result).toBe(REPORTS_DIR);
        expect(mockAllureService.runCommand).toHaveBeenCalledWith([
            "generate",
            config.RESULTS_STAGING_PATH,
            "--report-dir",
            REPORTS_DIR,
            "--clean"
        ]);
    });

});