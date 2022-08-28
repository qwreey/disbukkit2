const fs = require('fs')

let argsSchema = Object.entries({
    "--logfile": "logfile",
    "-l": "logfile",
    "--chatTellraw": "chatTellraw",
    "--chatFormatter": "chatFormatter",
    "--commandTellraw": "commandTellraw",
    "--commandFormatter": "commandFormatter",
    "--noPermission": "noPermission",
    "--session": "session",
})

let defaults = Object.entries({
    "logfile": "./logs/latest.log",
    "chatTellraw": "tellraw @a [{\"color\":\"green\",\"text\":\"[@${username}]\"},{\"color\":\"white\",\"text\":\" ${content}\"}]",
    "chatFormatter": "\x1b[35m[@${username}]\x1b[0m ${content}",
    "commandTellraw": "tellraw @a [{\"color\":\"green\",\"text\":\"[@${username}] execute \"},{\"color\":\"white\",\"text\":\" /${content}\"}]",
    "commandFormatter": "\x1b[35m[@${username}]\x1b[0m executed /${content}",
    "notPermitted": "\x1b[31m[@${username}] You don't have permission to execute that command\x1b[0m",
    "commandProcess": {
        "name": "tmux",
        "argsBeforeSession": ["send-keys","-t"],
        "argsBeforeCommand": [],
        "argsAfter": ["ENTER"]
    },
    "session": "minecraft",
    "chatableRole": null,
    "commandableRole": null,
    "allowedCommands": ["list "]
})

module.exports = {
    load() {
        const argv = require('minimist')(process.argv.slice(2));
        const configFile = argv["--config"] ?? argv["-c"] ?? "./disbucket.config.json"
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
        defaults.forEach(([key,value])=>{
            if (settings[key] === undefined) {
                settings[key] = value
            }
        })

        return settings
    }
}