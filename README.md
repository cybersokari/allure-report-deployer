# Allure Docker Deploy

![Deployment](https://github.com/cybersokari/allure-docker-deploy/actions/workflows/deploy.yaml/badge.svg?branch=main)

**Allure Docker Deploy** is a lightweight Docker image designed for testers who want to store and share their Allure test reports in the cloud. With minimal setup, this image enables local test results to be uploaded to a cloud storage bucket, generate a hosted Allure report, and share it via a Firebase-hosted website.

---

## Key Features
- **Cloud Storage Integration**: Upload and preserve test results in a Google Cloud Storage bucket.
- **Firebase Hosting**: Generate and host Allure reports on a website for easy sharing with stakeholders.
- **TTL-Optimized Deployment**: Configurable delay before deployment to ensure all test results are finalized.
- **Custom Firebase Hosting Site**: Override the default Firebase site ID for hosting.

---

## Requirements
1. **Google Cloud Credentials**:
    - Set up a Google Cloud service account with access to your storage bucket and Firebase Hosting.
    - Download the `GOOGLE_APPLICATION_CREDENTIALS` JSON file.

2. **Google Cloud Storage Bucket**:
    - A storage bucket to store test results and reports.

3. **Firebase Hosting Site**:
    - A configured Firebase Hosting site (default or custom).

---

## How It Works
1. Mount your test results directory (`/allure-results`) to the container.
2. Configure required environment variables:
    - `GOOGLE_APPLICATION_CREDENTIALS`: Path to your GCP credentials file.
    - `STORAGE_BUCKET`: The name of your Google Cloud Storage bucket.
3. Optionally, configure:
    - `TTL_SECS`: Delay in seconds before generating and uploading the report (default: 45 seconds).
    - `FIREBASE_SITE_ID`: Custom Firebase Hosting site ID.
4. The container watches for updates in the `/allure-results` directory. Once no new files are detected within the `TTL_SECS` timeframe, it generates and deploys the Allure report.

---

## Environment Variables

| Variable                     | Description                                                                 | Default          |
|------------------------------|-----------------------------------------------------------------------------|------------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to the GCP service account JSON file (required).                   | None             |
| `STORAGE_BUCKET`             | Google Cloud Storage bucket name (required).                                | None             |
| `TTL_SECS`                   | Time to wait (in seconds) before generating and uploading the report.       | 45               |
| `FIREBASE_SITE_ID`           | Firebase Hosting site ID to override the default site in the credentials.   | Default site ID  |

---

## Getting Started

### Step 1: Pull the Docker Image
```bash
docker pull sokari/allure-docker-deploy:latest
```

### Step 2: Run the Container
```shell
docker run -d \
  -e GOOGLE_APPLICATION_CREDENTIALS=/credentials/gcp-key.json \
  -e STORAGE_BUCKET=my-test-results-bucket \
  -e TTL_SECS=60 \
  -e FIREBASE_SITE_ID=my-custom-site-id \
  -v /path/to/allure-results:/allure-results \
  -v /path/to/gcp-key.json:/credentials/gcp-key.json \
  sokari/allure-docker-deploy
```


### Step 3: View the Hosted Report

After the report is generated, the URL to your hosted report will be output in the logs. Share it with your team!

Example Use Case

	1.	Run your tests locally.
	2.	Output test results to /allure-results.
	3.	The container detects updates and uploads results to Google Cloud Storage.
	4.	Once the test run is complete, an Allure report is generated and hosted on Firebase.
	5.	Share the report URL with stakeholders for review.

Logs and Debugging

View container logs:

`docker logs <container_id>`

Contributing

Contributions are welcome! Feel free to open issues or submit pull requests for bug fixes or new features.