const { spawn } = require("child_process")

module.exports = class commandHandler {
    constructor(config) {
        if (!config.commandProcess) {
            this.disabled = true
        }
        this.commandProcessConfig = config.commandProcess
        this.session = config.session
    }

    executeCommand(str) {
        let commandProcessConfig = this.commandProcessConfig
        let args = [
            ...commandProcessConfig.argsBeforeSession,
            this.session,
            ...commandProcessConfig.argsBeforeCommand,
            str,
            ...commandProcessConfig.argsAfter
        ]
        let commandProcess = spawn(
            commandProcessConfig.name,
            args
        )
        return new Promise(r=>{
            commandProcess.on('exit',()=>{r()})
        })
    }
}
