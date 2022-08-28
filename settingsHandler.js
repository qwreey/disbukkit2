
let argsSchema = Object.entries({
    "--logfile": "logfile",
    "-l": "logfile",
    "--chatCommand": "chatCommand",
})

let defaults = Object.entries({
    "logfile": "./logs/latest.log",
    "chatCommand": "tellraw @a [{\"color\":\"green\",\"text\":\"[@${username}]\"},{\"color\":\"white\",\"text\":\" ${content}\"}]",
})

module.exports = {
    load(configFile) {
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