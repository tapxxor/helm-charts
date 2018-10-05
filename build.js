const { join } = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const sh = require('./sh');
const helm = async(args) => {
    const output = await sh(`helm ${args}`);
    if (output) {
        console.log(output);
    }
};

const getChartDirectories = (path) => {
    if (isChartDirectory(path)) {
        return [path];
    }
    const getChartDirectoriesRec = (dir) => {
        return fs.readdirSync(dir)
            .filter(f => !f.startsWith('.'))
            .map(f => join(dir, f))
            .filter(isDirectory)
            .reduce((dirs, d) => dirs.concat(isChartDirectory(d) ? [d] : getChartDirectoriesRec(d)), []);
    };
    return getChartDirectoriesRec(path);
};

const isDirectory = (path) => {
    return fs.statSync(path).isDirectory();
};

const isChartDirectory = (path) => {
    return fs.existsSync(join(path, 'Chart.yaml'));
};

const ensureDirsReady = (destDir) => {
    mkdirp(destDir);
};

const buildCharts = async (chartSourcesDir, chartDestDir, chartVersion, appVersion) => {
    console.log(`Building helm charts from '${chartSourcesDir}'`);
    const dirs = getChartDirectories(chartSourcesDir);
    console.log(`Found ${dirs.length} chart directories.`);
    if (dirs.length === 0) {
        console.log('Nothing to do');
    }
    for (let dir of dirs) {
        console.log(`Processing directory: ${dir}`);
        try {
            await helm(`dependency build ${dir}`);
            let packageCommand = `package ${dir} -d ${chartDestDir}`;
            packageCommand += chartVersion ? ` --version ${chartVersion}` : ''
            packageCommand += appVersion ?  ` --app-version ${appVersion}` : ''
            await helm(packageCommand);
        } catch (e) {
            console.error(e.message);
            throw new Error(`Unable to build '${dir}'`);
        }
    }
};

const buildIndex = async (chartsDestDir) => {
    console.log(`Building helm charts repo index.`);
    await helm(`repo index ${chartsDestDir}`);
};

const build = async ({ source, output, version, appVersion }) => {
    try {
        ensureDirsReady(output);
        await buildCharts(source, output, version, appVersion);
        await buildIndex(output);
    } catch(e) {
        console.error(e);
        throw new Error(`Charts build has failed. ${e.message}`);
    }
};

module.exports = {
    build,
    setup: (parser) => {
        parser.addCommand('build', 'Builds all charts from the <source> directory, places them in the <output> directory and generates a repo index.')
            .addArgument(['-s', '--source'], { help: 'A directory with chart sources. It can either be a directory with a single Charts.yaml file or with subdirectories defining multiple charts', defaultValue: '.' })
            .addArgument(['-o', '--output'], { help: 'A directory chart packages should be produced in', defaultValue: 'charts-output' })
            .addArgument(['-v', '--version'], { help: 'A chart version if different than set in \'Chart.yaml\'' })
            .addArgument('--appVersion', { help: 'An appVersion if different than set in \'Chart.yaml\'' })
            .setHandler(build);
    }
};