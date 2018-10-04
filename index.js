#!/usr/bin/env node

const {CommandLineParser} = require('./cmd');
const pkg = require('./package.json');

const options = { version: pkg.version, description: pkg.description, addHelp: true };
const setups = [
    require('./build').setup,
    require('./publish').setup
];
const cmd = new CommandLineParser(pkg.name, options, setups);
cmd.parseAndExecute()
    .then(() => {
        process.exit(0);
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
