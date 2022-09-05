const fs = require('fs')

/*

[
    {
        name: "logfile",
        defaultValue: "./logs/latest.log",
        args: ["--logfile","l"],
        help: "path to Minecraft log file.",
        type: "String"
    },
    {
        name: "session",
        defaultValue: "minecraft",
        args: ["--session","-s"],
        help: "session name of screen or tmux",
        type: "String"
    },
    {
        name: "delay",
        defaultValue: "1500",
        args: ["--delay","-d"],
        help: "update delay in ms, if this value too low, cause limit rate error",
        type: "Number",
    },
    {
        name: "chatTellraw",
        defaultValue: ""
    }
]

TODO: Making auto docs

*/

let argsSchema = Object.entries({
    "--logfile": "logfile",
    "-l": "logfile",
    "--session": "session",
    "-s": "session",
    "--delay": "delay",
    "-d": "delay",
    "--chatTellraw": "chatTellraw",
    "--chatFormatter": "chatFormatter",
    "--commandTellraw": "commandTellraw",
    "--commandFormatter": "commandFormatter",
    "--commandNotPermitted": "commandNotPermitted",
    "--chatNotPermitted": "chatNotPermitted",
    "--chatableRole": "chatableRole",
    "--commandableRole": "commandableRole",
    "--allowedCommands": "allowedCommands",
    "--commandProcess": "commandProcess",
    "--maxlength": "maxlength",
    "--footer": "footer",
    "--header": "header",
    "--disableDokdo": "disableDokdo",
    "--dokdoOptions": "dokdoOptions",
})

let defaults = {
    "logfile": "./logs/latest.log",
    "chatTellraw": "execute as @a run tellraw @s [{\"color\":\"green\",\"text\":\"[@${username}]\"},{\"color\":\"white\",\"text\":\" ${content}\"}]",
    "chatFormatter": "\x1b[35m[@${username}]\x1b[0m ${content}",
    "commandTellraw": "execute as @a run tellraw @s [{\"color\":\"green\",\"text\":\"[@${username}] execute \"},{\"color\":\"white\",\"text\":\" /${content}\"}]",
    "commandFormatter": "\x1b[35m[@${username}]\x1b[0m executed /${content}",
    "commandNotPermitted": "\x1b[31m[@${username}] You don't have permission to execute that command\x1b[0m",
    "chatNotPermitted": "\x1b[31m[@${username}] You don't have permission to chat\x1b[0m",
    "commandProcess": {
        "name": "tmux",
        "argsBeforeSession": ["send-keys","-t"],
        "argsBeforeCommand": [],
        "argsAfter": ["ENTER"]
    },
    "session": "minecraft",
    "chatableRole": null,
    "commandableRole": null,
    "allowedCommands": ["list "],
    "delay": 1500,
    "header": "```ansi\n",
    "footer": "\n```",
    "maxlength": 2000,
    "disableDokdo": false,
    "dokdoOptions": {
        "prefix": "!",
        "aliases": ["dok"]
    }
}

let helps = {
    "logfile": "Path to minecraft log file.",
}

module.exports = {
    defaults: defaults,
    argsSchema: argsSchema,

    /** build help message */
    help() {

    },

    load() {
        const argv = require('minimist')(process.argv.slice(2));
        const configFile = argv["--config"] ?? argv["-c"] ?? "./disbukkit.config.json"
        if (!fs.existsSync(configFile)) {
            console.error(`ERROR: file ${configFile?.toString()} not found`)
            process.exit(1)
        }
        let configJson
        try {
            configJson = JSON.parse(fs.readFileSync(configFile))
        } catch (err) {
            console.error(`ERROR: failed to decode disbucket.config.json\n${err?.toString()}`)
            process.exit(1)
        }
        return this.merge(configJson,argv)
    },

    merge(jsondata,argv) {
        let settings = {}
        Object.entries(jsondata).forEach(([key,value])=>{
            settings[key] = value
        })
        argsSchema.forEach(([key,argName])=>{
            let value = argv[argName]
            try { value = JSON.parse(value) } catch {}
            if (value) settings[key] = value
        })
        Object.entries(defaults).forEach(([key,value])=>{
            if (settings[key] === undefined) {
                settings[key] = value
            }
        })

        return settings
    }
}
