
# Allure Deployer CLI

A command-line tool for deploying Allure test reports to Firebase Hosting. History, Retries, Aggregation and Slack notification.
No server Required.
</br>
</br>
Example report: https://gatedaccessdev.web.app
## Features

- **Firebase hosting**: Host your Allure reports on Firebase.
- **History and Retries**: Show Allure [History and Retries](https://allurereport.org/docs/history-and-retries/) in reports with history linking to previous reports.
- **Report Aggregation**: Aggregate report from multiple Allure result directories.
- **Slack integration**: Send report URL to Slack.

## Installation

```bash
npm install -g allure-deployer
```
## Commands

### `deploy`
Host your Allure test report on Firebase.

#### Syntax
```bash
allure-deployer deploy <allure-results-path> <report-name>
```

#### Example
```bash
allure-deployer deploy ./allure-results my-report-name \
  --bucket my-project-id.firebasestorage.app \
  --show-history \
  --retries 10 
```

#### Arguments
- `<allure-results-path>`: Path or comma-seperated paths to the directory containing Allure results (Default: `./allure-results`).
- `<report-name>`: The name/title of your report (Default: `Allure Report`).

#### Options
- `-h, --show-history`: Show history in the upcoming report when Storage `bucket` is provided.
- `-r, --retries <limit>`: Number of previous test runs to show as retries in the upcoming report when Storage `bucket` is provided.
- `--bucket <bucket-name>`: Directly provide a Firebase/GCP bucket name for History and Retries.
- `--gcp-json <json-path>`: Directly provide a Firebase/GCP JSON credential file for deployment.
- `-p, --prefix <prefix>`: The storage bucket path to back up Allure results and history files


### `generate`
Prepare an Allure test report locally without deploying it to Firebase.

#### Syntax
```bash
allure-deployer generate <allure-results-path> <report-name>
```

#### Example
```bash
allure-deployer generate ./allure-results my-local-report --show-history --retries 5 --output ./allure-report
```

#### Arguments
- `<allure-results-path>`: Path to the directory containing Allure results (Default: `./allure-results`).
- `<report-name>`: The name/title of your report (Default: `Allure Report`).

#### Options
- `-h, --show-history`: Include history in the generated report.
- `-r, --retries <limit>`: Specify the number of previous test runs to include as retries.
- `--bucket <bucket-name>`: Firebase/GCP bucket name for History and Retries.
- `--gcp-json <json-path>`: Firebase/GCP JSON credential file for additional configurations.
- `-p, --prefix <prefix>`: Storage bucket path to back up Allure results and history files.
- `-o, --output <output-dir>` A directory to generate the Allure report into (default: "allure-report")

#### Description
The `generate` command is useful for creating an Allure test report locally without deploying it to the cloud.
This allows for testing, reviewing reports and hosting with other tools.

### `gcp-json:set`
Set Firebase/GCP credentials for reuse.

#### Syntax
```bash
allure-deployer gcp-json:set <json-path>
```

#### Example
```bash
allure-deployer gcp-json:set ./firebase.json
```

### `bucket`
Set Firebase/GCP bucket for reuse

#### Syntax
```bash
allure-deployer bucket:set <bucket-name>
```

#### Example
```bash
allure-deployer bucket:set my-bucket.firebasestorage.app
```



## Workflow Example

1. **Run test and generate Allure results**:
    - Integrate Allure Test Report Framework in your project
    - Run test and create ./allure-results

2. **Generate and deploy the Report**:
   ```bash
   allure-deployer deploy path/to/allure-result --show-history --bucket gcp-bucket --gcp-json path/to/credential.json
   ```

3. **Access the Report**:
   The CLI outputs a deployment URL. Share this with your team!


## Requirements

- **Node.js**: Version 14 or higher.
- **Java**: Version 8 or higher
- **Firebase Credentials**:
   - Create a Firebase/GCP [service account](https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments).
   - Download the `service-account-file.json` JSON file.

- **Firebase Storage bucket**:
   - Create a Firebase storage bucket when your test History and Retries are stored. You can use the default bucket.

## Help
The CLI provides a set of commands to help you generate and deploy your Allure Reports. To see the list of available commands, run:
```shell
allure-deployer --help
```

## License

This project is licensed under the BSD-3 License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Feel free to fork the repository, create a feature branch, and submit a pull request.
