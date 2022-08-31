// discord js
const { Client, GatewayIntentBits, TextChannel, GuildMember } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });
const { default: Dokdo } =  require('dokdo')
const dokdo =  require('dokdo')
const messageHandlerClass = require("./messageHandler") // message update handler
const fileWatchClass      = require("./fileWatch") // file update handler
const logformatterClass   = require("./logformatter")
const commandHandlerClass = require("./commandHandler")
const settings            = require("./settingsHandler").load()

let /** @type { messageHandlerClass } */ channelMessageHandler,
    /** @type { TextChannel } */         channel,
    /** @type { fileWatchClass } */      logfileWatch,
    /** @type { logformatterClass } */   logformatter,
    /** @type { commandHandlerClass } */ commandHandler,
    /** @type { Dokdo } */               dokdoHandler

const /** @type { String } */ logfile          = settings.logfile
const /** @type { String } */ chatTellraw      = settings.chatTellraw
const /** @type { String } */ chatFormatter    = settings.chatFormatter
const /** @type { String } */ commandTellraw   = settings.commandTellraw
const /** @type { String } */ commandFormatter = settings.commandFormatter

// load dokdo
if (!settings.disableDokdo) dokdoHandler = new dokdo(client, settings.dokdoOptions)

/** Escape chat string */
function safeString(str) {
    return str.replace(/\\/,"\\\\").replace(/"/,'\\"').replace(/\n/,"")
}

/** Make chat to ingame */
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

/** Execute command */
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
    // load channel
    channel = await client.channels.fetch(settings.channelId)

    // load classes
    logformatter = new logformatterClass(settings) // formatter
    commandHandler = new commandHandlerClass(settings) // command handler
    channelMessageHandler = new messageHandlerClass(channel,{ // message handler
        settings: settings,
        formatter: logformatter.format.bind(logformatter),
        lastMessage: null,
    })
    logfileWatch = new fileWatchClass(logfile) // load log file watcher

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
    if (message.channel != channel) {
        try {
            return await dokdoHandler.run(message)
        } catch (err) {
            await message.reply(err)
        }
    }
    let content = message.content
    if (!content) return

    if (content == "/list") { // list players
        command(message.member,"list")
    } else if (content.startsWith("/")) { // command mode
        content = content.substring(1)
        let commandableRole = settings.commandableRole
        let allowed = commandableRole && message.member.roles.cache.has(commandableRole)

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
            command(message.member,content)
        } else {
            channelMessageHandler.appendMessage(
                settings.commandNotPermitted.replace(
                    /\${username}/,
                    safeString(message.member.displayName)
                )
            )
        }
    } else { // chat mode
        let chatableRole = settings.chatableRole
        if (!chatableRole || message.member.roles.cache.has(chatableRole)) {
            chat(message.member,content) // DO NOT AWAIT!
        } else {
            channelMessageHandler.appendMessage(
                settings.chatNotPermitted.replace(
                    /\${username}/,
                    safeString(message.member.displayName)
                )
            )
        }
    }
    await message.delete()
})

client.login(settings.TOKEN);


// watch()
