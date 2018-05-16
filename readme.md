# helm-charts

This utility helps to build and publish [Helm](https://helm.sh/) charts
to a raw Nexus repository.

It addresses issues with hosting
helm charts on Nexus which [currently doesn't support Helm repos](https://issues.sonatype.org/browse/NEXUS-13325).

## Usage

Prerequisites: [NodeJS](https://nodejs.org/en/), [helm](https://github.com/kubernetes/helm#install).

### Standalone

```bash
# Install the utility
npm i -g helm-charts

# Builds all charts from the ./charts directory, places them in the ./charts-output directory and generates a repo index.
helm-charts build --source ./charts

# Publishes all charts from the ./charts-output directory to a raw Nexus repo available at https://some.nexus.example.com/repository/helm-raw/charts
helm-charts publish --repository https://some.nexus.example.com/repository/helm-raw/charts --username <REPO_USER> --password <REPO_PASS>
```

The chart publishing mechanism puts its best efforts to resolve possible charts versioning conflicts.
When the chart that's about to be added already exists in the remote repo:
- **it is skipped** - when they both have the same content (sha256 checksum matches).
- **an error is raised** - when their content is different.

### NPM-based

1. Install the utility in your project.

   ```bash
   # Install the utility
   npm i --save-dev helm-charts
   ```

2. Put the following in your `package.json`:

   ```json
   {
     "scripts": {
       "helm-charts:build": "helm-charts build",
       "helm-charts:publish": "helm-charts publish --repository https://some.nexus.example.com/repository/helm-raw/charts"
     }
   }
   ```

3. Run it as follows:

   ```bash
   npm run helm-charts:build
   npm run helm-charts:publish -- --username <REPO_USER> --password <REPO_PASS>
   ```