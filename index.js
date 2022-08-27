// just something
const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs')

// args / env
const logfile = argv["--logfile"] ?? argv ?? "./logs/latest.log"
if (!fs.existsSync("./disbucket.config.json")) {
    console.error("ERROR: disbucket.config.json file not found on this directory")
    process.exit(1)
}
let settings
try {
    settings = JSON.parse(fs.readFileSync("./disbucket.config.json"))
} catch (err) {
    console.error(`ERROR: failed to decode disbucket.config.json\n${err?.toString()}`)
    process.exit(1)
}

// discord js
const { Client, GatewayIntentBits, TextChannel } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const messageBufferClass = require("./messageBuffer") // message update handler
const fileWatchClass = require("./fileWatch") // file update handler
const logformatterClass = require("./logformatter")

let /** @type { messageBuffer } */  channelMessageBuffer,
    /** @type { TextChannel } */    channel,
    /** @type { fileWatchClass } */ logfileWatch,
    /** @type { logformatterClass } */   logformatter
async function chat(member) {
}

client.on('ready', async () => {
    // load channel buffer
    channel = await client.channels.fetch(settings.channelId)
    channelMessageBuffer = new messageBufferClass(channel,null)

    // load log formatter
    logformatter = new logformatterClass(config)

    // load log file watcher
    logfileWatch = new fileWatchClass(settings.logfile)
    logfileWatch.on("append",(/** @type {String} */ content)=>{
        channelMessageBuffer.appendMessage(
            logformatter.format(content)
        )
    })
    logfileWatch.start()

    console.log(`Logged in as ${client.user.tag}!`)
});
client.on('messageCreate', async message => {
    if (message.channel != channel) return

    let content = message.content
    if (!content) return
})

client.login(settings.TOKEN);


// watch()
