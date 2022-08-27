const watch = require("node-watch")
const fs = require("fs")
const EventEmitter = require("events")

// read function
async function readFileAt(filename,start,length) {
    let fd = await fs.promises.open(filename)
    let buf = Buffer.alloc(length,0,'utf-8')
    await fd.read(buf,0,length,start)
    await fd.close()
    return buf.toString()
}

class fileWatch extends EventEmitter {
    constructor (filepath) {
        super()
        this.filepath = filepath
    }

    async watching(evt, name) {
        let nowStatus = await fs.promises.stat(this.filepath)
        // await readFileAt()

        let start = this.lastStatus.size
        let diff = nowStatus.size - start
        if (nowStatus.size == 0) {
            this.emit("reset")
        } else if (diff == 0) {
            return
        } else if (diff > 0) {
            this.emit("append",await readFileAt(this.filepath,start,diff))
        } else if (diff <0) {
            this.emit("remove",-diff)
        }

        this.lastStatus = nowStatus
    }

    async start() {
        /** @type { import("fs").StatsBase } */
        this.lastStatus = await fs.promises.stat(this.filepath)
        watch(
            this.filepath,{ encoding: "utf-8" },
            this.watching.bind(this)
        )
    }
}

module.exports = fileWatch
