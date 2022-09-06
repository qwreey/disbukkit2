const { TextChannel, Message } = require("discord.js")

class messageBuffer {
    constructor (channel,config) {
        /** @type { Message } */
        this.lastMessage = config?.lastMessage
        /** @type { TextChannel } */
        this.channel = channel

        this.formatter = config?.formatter
        this.committed = []
        this.updateTimeout = null
        this.changedWhenTimeout = false
        this.delay = parseInt(config?.settings?.delay) || 1500

        this.header = config?.settings?.header ?? "```ansi\n"
        this.footer = config?.settings?.footer ?? "\n```"
        this.maxlength = (config?.settings?.maxlength ?? 2000) - this.header.length - this.footer.length
    }

    async commitMessage() {
        let lastCommitted = this.committed
        this.committed = [lastCommitted[lastCommitted.length-1]]
        for (let index = 0;index<lastCommitted.length;index++) {
            let str = lastCommitted[index]
            if (!str) continue
            let content = str+this.footer
            if (index == 0 && this.lastMessage?.editable) {
                if (this.lastMessage.content != content) {
                    try {await this.lastMessage.edit(content)}
                    catch (err) {
                        console.error(`[ERROR] Error occurred on editing message (${err})`)
                        this.lastMessage = await this.channel.send(content)
                    }
                }
                continue
            }
            this.lastMessage = await this.channel.send(content)
        }
    }

    setLastMessage(message) {
        this.lastMessage = message
    }

    async delayedUpdate() {
        if (this.commitMessagePromise) {
            await this.commitMessagePromise
        }
        this.updateTimeout = null
        if (this.changedWhenTimeout) {
            this.changedWhenTimeout = false
            this.commitMessagePromise = this.commitMessage()
            this.updateTimeout = setTimeout(
                this.delayedUpdate.bind(this),
                this.delay,this
            )
        }
    }

    updateMessage() {
        if (this.updateTimeout) {
            this.changedWhenTimeout = true
        } else {
            this.commitMessagePromise = this.commitMessage()
            this.updateTimeout = setTimeout(
                this.delayedUpdate.bind(this),
                this.delay,this
            )
        }
    }

    appendMessage(appendString,noFormatter) {
        let formatter = this.formatter
        for (let str of appendString.split("\n")) {
            if ((!noFormatter) && formatter) str = formatter(str)
            if (!str || str.length == 0) continue

            str = str.trim() + "\n"
            let buflen = this.committed.length
            if (buflen == 0 || !this.committed[0]) {
                this.committed[0] = this.header + str
                continue
            }

            if (this.committed[buflen-1].length + str.length <= this.maxlength) {
                this.committed[buflen-1] += str
            } else this.committed[buflen] = this.header + str.substring(0,this.maxlength)
        }

        this.updateMessage()
    }
}
module.exports = messageBuffer
