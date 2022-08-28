// discord js
const { Client, GatewayIntentBits, TextChannel, GuildMember } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });
const messageHandlerClass = require("./messageHandler") // message update handler
const fileWatchClass = require("./fileWatch") // file update handler
const logformatterClass = require("./logformatter")
const commandHandlerClass = require("./commandHandler")
const settings = require("./settingsHandler").load()

let /** @type { messageBuffer } */     channelMessageHandler,
    /** @type { TextChannel } */       channel,
    /** @type { fileWatchClass } */    logfileWatch,
    /** @type { logformatterClass } */ logformatter,
    /** @type {commandHandlerClass} */ commandHandler

const /** @type { String } */ logfile = settings.logfile
const /** @type { String } */ chatTellraw = settings.chatTellraw
const /** @type { String } */ chatFormatter = settings.chatFormatter
const /** @type { String } */ commandTellraw = settings.commandTellraw
const /** @type { String } */ commandFormatter = settings.commandFormatter

function safeString(str) {
    return str.replace(/"/,'\\"').replace(/\\/,"\\\\").replace(/\n/,"")
}

/** @param { GuildMember } member member who chatted */
/** @param { String } content content of message */
async function chat(member,content) {
    channelMessageHandler.appendMessage(chatFormatter
        .replace(/\${username}/,member.displayName.replace(/`/,""))
        .replace(/\${content}/,content.replace(/`/,"")),true
    )
    await commandHandler.executeCommand(chatTellraw
        .replace(/\${username}/,safeString(member.displayName))
        .replace(/\${content}/,safeString(content))
    )
}
async function command(member,content) {
    channelMessageHandler.appendMessage(commandFormatter
        .replace(/\${username}/,member.displayName.replace(/`/,""))
        .replace(/\${content}/,content.replace(/`/,"")),true
    )
    await Promise.all([
        commandHandler.executeCommand(commandTellraw
        .replace(/\${username}/,safeString(member.displayName))
            .replace(/\${content}/,safeString(content))
        ),
        commandHandler.executeCommand(content)
    ])
}

client.on('ready', async () => {
    // load log formatter
    logformatter = new logformatterClass(settings)
    commandHandler = new commandHandlerClass(settings)

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
    if (message.author.bot) return
    if (commandHandler.disabled) return
    if (message.channel != channel) return
    let content = message.content
    if (!content) return

    if (content == "/list") { // list players
        await command(message.member,"list")
    } else if (content.startsWith("/")) { // command mode
        content = content.substring(1)
        let allowed

        if (!allowed && settings.allowedCommands) {
            let chatableRole = settings.chatableRole
            if (!chatableRole || message.member.roles.cache.has(chatableRole)) {
                for (let command of settings.allowedCommands) {
                    if (content.startsWith(command)) {
                        allowed = true
                    }
                }
            }
        }

        if (allowed) {
            await command(message.member,content)
        } else {
            channelMessageHandler.appendMessage(
                settings.notPermitted.replace(
                    /\${username}/,
                    safeString(message.member.displayName)
                )
            )
        }
    } else { // chat mode
        let chatableRole = settings.chatableRole
        if (!chatableRole || message.member.roles.cache.has(chatableRole)) {
            await chat(message.member,content)
        }
    }
    await message.delete()
})

client.login(settings.TOKEN);


// watch()
