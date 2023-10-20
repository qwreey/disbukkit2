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
        .replace(/\${username}/,member.user.tag.replace(/`/,""))
        .replace(/\${content}/,content.replace(/`/,"")),true
    )
    await commandHandler.executeCommand(chatTellraw
        .replace(/\${username}/,safeString(member.user.tag))
        .replace(/\${content}/,safeString(content))
    )
}

/** Execute command */
async function command(member,content) {
    channelMessageHandler.appendMessage(commandFormatter
        .replace(/\${username}/,member.user.tag.replace(/`/,""))
        .replace(/\${content}/,content.replace(/`/,"")),true
    )
    await Promise.all([
        commandHandler.executeCommand(commandTellraw
        .replace(/\${username}/,safeString(member.user.tag))
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
            if (content.match(/^\[\d+:\d+:\d+] \[Server thread\/INFO\]: Done \([\d\.]+s\)! For help, type "help"/)) {
                console.log(`[INFO] Tracking log file '${logfile}' started`)
                channelMessageHandler.appendMessage("\x1b[32;1m[ Server started ]\x1b[0m")
                ignore = false
            }
            return
        }

        // when closing
        if (content.match(/^\[\d+:\d+:\d+] \[Server thread\/INFO\]: Stopping the server/)) {
            console.log("[INFO] Stopped tracking log file")
            channelMessageHandler.appendMessage("\x1b[31;1m[ Server closed ]\x1b[0m")
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

function checkIsDisabledCommand(content) {
    if (!content.startsWith(settings.commandPrefix)) return
    let disabledCommandList = settings.disabledCommandList
    if (!disabledCommandList) return
    for (let item of disabledCommandList) {
        let commandName = settings.commandPrefix+item
        if (content == commandName || content.startsWith(commandName + " ")) return true
    }
}

function checkAllowedCommandsForChatable(content) {
    let allowedCommandsForChatable = settings.allowedCommandsForChatable
    for (let item of allowedCommandsForChatable) {
        if (content == item || content.startsWith(item + " ")) return true
    }
}

client.on('messageCreate', async message => {
    if (message.author.bot) return
    if (commandHandler.disabled) return
    if (message.channel != channel) {
        try {
            return await dokdoHandler.run(message)
        } catch (err) {
            try { await message.reply(err) } catch {}
        }
    }
    let content = message.content
    if (!content) return

    if (checkIsDisabledCommand(content)) {
        channelMessageHandler.appendMessage(
            settings.disabledCommand.replace(
                /\${username}/,
                safeString(message.author.tag)
            )
        )
    } else if (content.startsWith(settings.commandPrefix)) { // command mode
        content = content.substring(settings.commandPrefix.length)
        let commandableRole = settings.commandableRole
        let allowed = commandableRole && message.member.roles.cache.has(commandableRole) // check user have permission to use command

        // if user have no permission to command, check allowed commands
        if (!allowed && settings.allowedCommandsForChatable) {
            let chatableRole = settings.chatableRole
            if (!chatableRole || message.member.roles.cache.has(chatableRole)) { // check user have chatable role
                allowed = checkAllowedCommandsForChatable(content)
            }
        }

        if (allowed) { // allowed to command
            command(message.member,content)
        } else { // not permitted
            channelMessageHandler.appendMessage(
                settings.commandNotPermitted.replace(
                    /\${username}/,
                    safeString(message.author.tag)
                )
            )
        }
    } else { // chat mode
        let chatableRole = settings.chatableRole
        if (!chatableRole || message.member.roles.cache.has(chatableRole)) {
            if (content.length > settings.maxMessageLength) {
                channelMessageHandler.appendMessage(
                    settings.messageTooLong.replace(
                        /\${username}/,
                        safeString(message.author.tag)
                    )
                )
            } else {
                chat(message.member,content) // DO NOT AWAIT!
            }
        } else {
            channelMessageHandler.appendMessage(
                settings.chatNotPermitted.replace(
                    /\${username}/,
                    safeString(message.author.tag)
                )
            )
        }
    }
    await message.delete()
})

client.login(settings.TOKEN);


// watch()
