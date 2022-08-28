// just load modules
const fs = require('fs')

// load settings
let settings = require("./settingsHandler").load(argv["--config"] ?? argv["-c"] ?? "./disbucket.config.json")

// discord js
const { Client, GatewayIntentBits, TextChannel, GuildMember } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const messageHandlerClass = require("./messageHandler") // message update handler
const fileWatchClass = require("./fileWatch") // file update handler
const logformatterClass = require("./logformatter")

let /** @type { messageBuffer } */  channelMessageHandler,
    /** @type { TextChannel } */    channel,
    /** @type { fileWatchClass } */ logfileWatch,
    /** @type { logformatterClass } */   logformatter

const /** @type { String } */ logfile = settings.logfile
const /** @type { String } */ chatCommand = settings.chatCommand

/** @param { GuildMember } member member who chatted */
/** @param { String } content content of message */
async function chat(member,content) {
    let command = chatCommand
        .replace(/\${username}/,member.displayName)
        .replace(/\${content}/,content.replace(/"/,'\\"'))
    
}

client.on('ready', async () => {
    // load log formatter
    logformatter = new logformatterClass(settings)

    // load channel buffer
    channel = await client.channels.fetch(settings.channelId)
    channelMessageHandler = new messageHandlerClass(channel,null)
    channelMessageHandler.formatter = logformatter.format.bind(logformatter)

    // load log file watcher
    logfileWatch = new fileWatchClass(logfile)
    let ignore = false
    logfileWatch.on("append",(/** @type {String} */ content)=>{
        // when startup
        if (ignore) {
            if (content.match(/Timings Reset/)) {
                console.log(`[INFO] Tracking log file '${logfile}' started`)
                channelMessageHandler.appendMessage("Timings Reset")
                ignore = false
            }
            return
        }

        // when closing
        if (content.match(/^\[\d+:\d+:\d+] \[Server thread\/INFO\]: Stopping the server/)) {
            console.log("[INFO] Stopped tracking log file")
            channelMessageHandler.appendMessage("Stopping the server")
            ignore = true
            return
        }

        // update message
        channelMessageHandler.appendMessage(content)
    })

    // when start up bucket, enable ignore mode
    // for removing message which not usefull for players
    logfileWatch.on("reset",()=>{
        console.log(`[INFO] Log file was inited`)
        ignore = true
    })
    logfileWatch.start()

    console.log(`[INFO] Logged in as ${client.user.tag}!`)
})

client.on('messageCreate', async message => {
    if (message.channel != channel) return
    let content = message.content
    if (!content) return

    if (content == "/list") { // list players
        await execute(message.member,"/list")
    } else if (content.startsWith("/")) { // command mode
        await execute(message.member,content.substring(1))
    } else { // chat mode
        if (message.member.roles.cache.has(settings.chat))
        await chat(message.member,content)
    }
    await message.delete()
})

client.login(settings.TOKEN);


// watch()
