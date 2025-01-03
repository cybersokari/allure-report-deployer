
# Allure Deployer CLI

A command-line tool for deploying Allure test reports to Firebase Hosting. History and Retries and Slack notification.
No server Required.
</br>
</br>
Example report: https://gatedaccessdev.web.app
## Features

- **Web hosting**: Host your Allure reports on web, not storage.
- **History and Retries**: Show Allure [History and Retries](https://allurereport.org/docs/history-and-retries/) in reports with history linking to previous reports.
- **Cloud Backup**: Save test results in storage for future analysis.
- **Slack integration**: Send report URL to Slack.

## Installation

Install globally using npm:

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
allure-deployer deploy ./allure-results my-report-name --show-history
```

#### Arguments
- `<allure-results-path>`: Path to the directory containing Allure results (Default: `./allure-results`).
- `<report-name>`: The name/title of your report (Default: `Allure Report`).

#### Options
- `-h, --show-history`: Show history in the upcoming report. Requires `--bucket` option
- `-r, --show-retries`: Show retries in the upcoming report. Requires `--bucket` option
- `--bucket <bucket-name>`: Directly provide a Firebase/GCP bucket name for History and Retries.
- `--gcp-json <json-path>`: Directly provide a Firebase/GCP JSON credential file for deployment.
- `-p, --prefix <prefix>`: The storage bucket path to back up Allure results and history files

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

## Help
The CLI provides a set of commands to help you generate and deploy your Allure Reports. To see the list of available commands, run:
```shell
allure-deployer --help
```

## Contributing

Contributions are welcome! Feel free to fork the repository, create a feature branch, and submit a pull request.
