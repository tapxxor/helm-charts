const { spawn } = require('child-process-async');

const sh = async (command) => {
    console.log(`$ ${command}`);
    const commandArr = command.split(/\s+/);
    const procName = commandArr[0];
    let proc;
    try {
        proc = await spawn(procName, commandArr.splice(1));
    } catch(e) {
        if (e.code === 'ENOENT') {
            throw new Error(`Failed to run ${command} command. Make sure ${command} is installed and added to the $PATH`);
        }
        throw e;
    }
    const output = proc.stdout.toString('utf8');
    if (output.trim().length) {
        return output;
    }
    if (proc.exitCode !== 0) {
        throw new Error(proc.stderr);
    }
    return null;
};

module.exports = sh;