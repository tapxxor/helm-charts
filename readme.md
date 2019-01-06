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

# Build docker image 
docker image build -t helm-nexus-plugin:0.0.1 .

# run a nexus2 repository
docker run -d -p 8081:8081 --network=host --name nexus -v nexus-data:/sonatype-work sonatype/nexus

# make a site repository
through nexus from localhost:8081/nexus, login with admin@admin123 to create the site repo

# build charts
docker container run --network=host --rm -v $(pwd):/input --name push helm-nexus-plugin:0.0.1 helm-charts build  --source /input/elasticsearch

example output
```
Building helm charts from '/input/elasticsearch'
Found 1 chart directories.
Processing directory: /input/elasticsearch
$ helm dependency build /input/elasticsearch
No requirements found in /input/elasticsearch/charts.

$ helm package /input/elasticsearch -d charts-output
Successfully packaged chart and saved it to: charts-output/elasticsearch-1.15.4.tgz

Building helm charts repo index.
$ helm repo index charts-output
```
# release chart
docker container run  --rm -v $(pwd):/input --name push helm-nexus-plugin:0.0.1 helm-charts publish --repository http://192.168.2.9:8081/nexus/content/sites/atypon-charts/elasticsearch   --username admin --password admin123
```
Unable to get repository index http://192.168.2.9:8081/nexus/content/sites/atypon-charts/elasticsearch/index.yaml. The index file is missing. Assuming this is the first deployment.
There are 1 new chart(s) to publish
Publishing charts-output/elasticsearch-1.15.4.tgz
Updating remote repo index
Charts deployed successfully.
```