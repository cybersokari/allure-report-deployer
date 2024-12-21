
# Allure Deployer CLI

A command-line tool for deploying Allure test reports to Firebase Hosting. History and Retries and Slack notification.
No server Required.

## Features

- **Ephemeral URLs**: No need to clean up outdated test reports. [Firebase Hosting channels](https://firebase.google.com/docs/hosting/manage-hosting-resources#preview-channel-expiration) takes care of it.
- **History and Retries**: Show Allure [History and Retries](https://allurereport.org/docs/history-and-retries/) in your report.
- **Cloud Backup**: Save test results in storage for future analysis.
- **Slack integration**: Send report URL to Slack.

## Installation

Install globally using npm:

```bash
npm install -g allure-deployer
```
## Commands

### `deploy`
Deploy an Allure test report to Firebase Hosting.

#### Syntax
```bash
allure-deployer deploy <allure-results-path> <website-id>
```

#### Example
```bash
allure-deployer deploy ./allure-results my-report-id --keep-history
```

#### Arguments
- `<allure-results-path>`: Path to the directory containing Allure results (Default: `./allure-results`).
- `<website-id>`: A unique identifier for the deployed report (Default: `allure-report`).

#### Options
- `-kh, --keep-history`: Upload history to storage to enable history in the next report.
- `-kr, --keep-results`: Upload results to storage to enable retries in the next report.
- `-h, --show-history`: Show history in the upcoming report.
- `-r, --show-retries`: Show retries in the upcoming report.
- `--bucket <bucket-name>`: Directly provide a Firebase/GCP bucket name for deployment.
- `--gcp-json <json-path>`: Directly provide a Firebase/GCP JSON credential file for deployment.

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
   allure-deployer deploy ./allure-result --keep-history --bucket gcp-bucket --gcp-json ./firebase.json
   ```

3. **Access the Report**:
   The CLI outputs a deployment URL. Share this with your team!


## Requirements

- **Node.js**: Version 14 or higher.
- **Java**: Version 8 or higher

## Help
The CLI provides a set of commands to help you generate and deploy your Allure Reports. To see the list of available commands, run:
```shell
allure-deployer --help
```

## Contributing

Contributions are welcome! Feel free to fork the repository, create a feature branch, and submit a pull request.
