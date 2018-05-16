const fs = require('fs');
const {ArgumentParser} = require('argparse');
const _ = require('lodash');

const ALL_COMMAND_PARAMETERS = ['--jsonTemplate', '--resolveEnv', '--configFile'];

class JsonTemplateHandler {
    canHandle(args) {
        return !!args.jsonTemplate;
    }
    handle(command) {
        const argNames = command.getArguments().map(a => {
            return _.first(a.selector.filter(s => { return s.startsWith('--'); }).map(s => { return s.substring(2); }));
        }).filter(a => { return ALL_COMMAND_PARAMETERS.indexOf(`--${a}`) < 0; });
        const sampleReq = _.reduce(argNames, (memo,elem) => {
            memo[elem] = '';
            return memo;
        }, {});
        console.log(JSON.stringify(sampleReq, null, 2));
    }
}

class ConfigFileHandler {
    constructor() {
    }
    canHandle(args) {
        return !!args.configFile;
    }
    handle(command, args, func) {
        let resolver = ConfigItemResolvers.json();
        if (args.resolveEnv) {
            resolver = ConfigItemResolvers.jsonWithEnvironmentVariablesResolution();
            delete args.resolveEnv;
        }
        let externalConfig = ConfigItem.loadResolved(args.configFile, null, resolver);
        if (!externalConfig) {
            throw new Error(`Unable to load config file: ${args.configFile}`);
        }
        let actualArgs = Object.assign({}, externalConfig.value, args);
        delete actualArgs.configFile;
        delete actualArgs.func;
        return func(actualArgs);
    }
}

class DefaultHandler {
    canHandle() {
        return true;
    }
    handle(command, args, func) {
        delete args.func;
        return func(args);
    }
}

const COMMAND_HANDLERS = [
    new JsonTemplateHandler(),
    new ConfigFileHandler(),
    new DefaultHandler()
];

class ConfigItem {

    constructor(filePath, value) {
        this._filePath = filePath;
        this._value = value;
    }

    get filePath() {
        return this._filePath;
    }

    get value() {
        return this._value;
    }

    static load(filePath, defaultValue=null) {
        return ConfigItem._loadInternal(filePath, defaultValue, ConfigItemResolvers.json());
    }

    static loadResolved(filePath, defaultValue=null, resolver=null) {
        return ConfigItem._loadInternal(filePath, defaultValue, resolver);
    }

    static _loadInternal(filePath, defaultValue, resolver) {
        try {
            let fileContent = fs.readFileSync(filePath, 'utf8');
            return new ConfigItem(filePath, resolver(fileContent));
        } catch(e) {
            return defaultValue;
        }
    }
}

class ConfigItemResolvers {
    static json() {
        return JSON.parse;
    }

    static jsonWithEnvironmentVariablesResolution() {
        return (content) => {
            const escapeMap = {
                '\\': '\\\\',
                '"': '\\"'
            };
            const resolvedContent = content.replace(/\$\{(.+?)(:(.*?))?\}/g, (match, variableName, g2, defaultValue) => {
                return Ensure.escapedCharacters(process.env[variableName], escapeMap) || defaultValue || '';
            });
            return JSON.parse(resolvedContent);
        };
    }

}

class CommandGroup {
    constructor(parser, name, parentCommand=null) {
        this._parser = parser;
        this._parentCommand = parentCommand;
        this._childParsers = {};
        this._commands = [];
        this._name = name;
    }

    addCommandGroup(name, help) {
        let parser = this._getOrCreateParser(name, help);
        let commandGroup = new CommandGroup(parser, name, this);
        this._commands.push(commandGroup);
        return commandGroup;
    }

    addCommand(name, help) {
        let parser = this._getOrCreateParser(name, help);
        let command = new Command(parser, name, this, help);
        this._commands.push(command);
        return command
            .addArgument(['--jsonTemplate'], {help: 'Generates a JSON template for all parameters that can be used in this command.', nargs: 0 })
            .addArgument(['--resolveEnv'], {help: 'When set, resolves environment variable placeholders for values (not keys!) in JSON files (similarly to envsubst linux command).', nargs: 0 })
            .addArgument(['--configFile'], {help: 'A path to JSON file containing parameters for this command'});
    }

    _getOrCreateCommandSub() {
        if (!this._commandSub) {
            this._commandSub = this._parser.addSubparsers();
        }
        return this._commandSub;
    }

    _getOrCreateParser(name, help) {
        if (!this._childParsers[name]) {
            this._childParsers[name] = this._getOrCreateCommandSub().addParser(name, {addHelp: true, help: help, description: help});
        }
        return this._childParsers[name];
    }

    getKey() {
        let parentKey = this._parentCommand ? this._parentCommand.getKey() + ' ' : '';
        return `${parentKey}${this._name}`;
    }

    docs() {
        let list = [];
        for (let cmd of this._commands) {
            list = list.concat(cmd.docs());
        }
        return list;
    }

    end() {
        return this._parentCommand;
    }
}

class Command {
    constructor(parser, name, parentCommand=null, help=null) {
        this._parser = parser;
        this._parentCommand = parentCommand;
        this._help = help;
        this._name = name;
        this._arguments = [];
    }

    getArguments() {
        return this._arguments;
    }


    addArgument(args, options) {
        this._arguments.push(Object.assign({ selector: args }, options));
        this._parser.addArgument(args, options);
        return this;
    }

    setHandler(func) {
        const that = this;
        const handler = (args) => {
            let actualArgs = Ensure.nonNullProperties(args);
            for (let handler of COMMAND_HANDLERS) {
                if (handler.canHandle(actualArgs)) {
                    return handler.handle(that, actualArgs, func);
                }
            }
            throw new Error('Unable to perform this command. No handler found.');
        };
        this._parser.setDefaults({
            func: handler
        });
        return this;
    }

    getKey() {
        return `${this._parentCommand.getKey()} ${this._name}`;
    }

    docs() {
        return [{
            key: this.getKey(),
            help: this._help,
            arguments: this._arguments.filter(a => ALL_COMMAND_PARAMETERS.indexOf(a.selector[0]) === -1)
        }];
    }

    end() {
        return this._parentCommand;
    }
}

class Ensure {

    static nonNullProperties(obj) {
        let copy = {};
        for (let prop in obj) {
            if (obj.hasOwnProperty(prop) && obj[prop] !== null) {
                copy[prop] = obj[prop];
            }
        }
        return copy;
    }

    static escapedCharacters(value, replaceMap) {
        if (!value) {
            return value;
        }
        return _.reduce(replaceMap, (res, v, k) => { return res.replace(new RegExp(`\\${k}`, 'g'), v); }, value);
    }
}

class CommandLineParser extends CommandGroup {

    constructor(name, options, setups = []) {
        super(new ArgumentParser(options), name);
        this._options = options;
        for (let setup of setups) {
            setup(this);
        }
    }

    docs() {
        return {
            description: this._options.description,
            version: this._options.version,
            commands: super.docs().sort((a,b) => { return a.key.localeCompare(b.key); })
        };
    }

    parseAndExecute(actualArgs) {
        try {
            let args = this._parser.parseArgs(actualArgs);
            let answer = args.func(args);
            return answer && answer.then === 'function'
                ? answer
                : Promise.resolve(answer);
        } catch (e) {
            return Promise.reject(e);
        }
    }
}

module.exports = {
    CommandLineParser
};
