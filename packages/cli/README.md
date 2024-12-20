
# Allure Deployer CLI

A command-line tool for deploying Allure test reports to Firebase Hosting. History and Retries and Slack notification.
No server Required.

## Features

- **Deploy Allure Test Reports**: Quickly deploy test results to Firebase Hosting.
- **History and Retries**: Add historical data and retries for enhanced debugging.
- **Customizable**: Supports multiple deployment configurations using Firebase credentials.
- **Automation Ready**: Perfect for CI/CD pipelines.

## Installation

Install globally using npm:

```bash
npm install -g allure-deployer-cli
```
## Commands

### `deploy`
Deploy an Allure test report to Firebase Hosting.

#### Syntax
```bash
allure-deployer deploy [options] <allure-results-path> <website-id>
```

#### Arguments
- `<allure-results-path>`: Path to the directory containing Allure results (Default: `./allure-results`).
- `<website-id>`: A unique identifier for the deployed report (Default: `allure-report`).

#### Options
- `-kh, --keep-history`: Upload history to storage to enable history in the next report.
- `-kr, --keep-results`: Upload results to storage to enable retries in the next report.
- `--gcp-json <json-path>`: Path to the Firebase/GCP JSON credential file.
- `--gcp-token <token>`: Directly provide a GCP token for deployment.
- `--runtime-directory <directory>`: Override the default runtime directory for temporary files.

#### Example
```bash
allure-deployer deploy ./allure-results allure-report --keep-history --gcp-json ./firebase.json
```

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

#### Options
- `--save-credentials`: Save credentials for reuse.

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
- **Java**: Version 11 or higher

## Help
The CLI provides a set of commands to help you generate and deploy your Allure Reports. To see the list of available commands, run:
```shell
allure-deployer --help
```

## License

Licensed under the MIT License. See the `LICENSE` file for details.

## Contributing

Contributions are welcome! Feel free to fork the repository, create a feature branch, and submit a pull request.
