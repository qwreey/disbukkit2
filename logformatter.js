class logformatter {
    /*
Imported from https://github.com/qwreey75/disbucket/blob/master/init.lua

-- colors
local colors = {
    ["%[.-:.-:.- WARN%]:.-"] = "\27[33;1m%s\27[0m";
    [".-issued server command:.-"] = "\27[32;1m%s\27[0m";
    [".-joined the game.-"] = "\27[33;1m%s\27[0m";
    [".-left the game.-"] = "\27[33;1m%s\27[0m";
    ["(%[.- INFO%]: )(%[.+%])(.-)"] = "%s\27[47;1m%s\27[0m%s";
}
local colorsAfter = {
    ["%d+%.%d+%.%d+%.%d+:%d+"] = "\27[32;1m( IP-Port )\27[0m";
    ["%d+%.%d+%.%d+%.%d+"] = "\27[32;1m( IP )\27[0m";
    [".-issued server command: /w .-"] = "\27[32;1m[ Private Message ]\27[0m";
    [".-issued server command: /msg .-"] = "\27[32;1m[ Private Message ]\27[0m";
    [".-issued server command: /tell .-"] = "\27[32;1m[ Private Message ]\27[0m";
    [".-issued server command: /teammsg .-"] = "\27[32;1m[ Private Message ]\27[0m";
    [".-issued server command: /tm .-"] = "\27[32;1m[ Private Message ]\27[0m";
    ["%[.-:.-:.- WARN%]:.-"] = "\27[33;1m%s\27[0m";
    [".-issued server command:.-"] = "\27[32;1m%s\27[0m";
    [".-joined the game.-"] = "\27[33;1m%s\27[0m";
    [".-left the game.-"] = "\27[33;1m%s\27[0m";
    ["(%[.- INFO%]: )(%[.+%])(.-)"] = "%s\27[47;1m%s\27[0m%s";
}

    */

    defaultColorFormatter = [
        // we can set formatter

        // join and leave message
        [/.*joined the game.*/,str=>`\x1b[33;1m${str}\x1b[0m`],

        // claer some useless datas
        [/\[Async Chat Thread - #\d+\/INFO\]:\s/,""],
        [/\[Server thread\/INFO\]: /,""],
    ]

    constructor(config) {
        this.config = config
        this.colorFormatter = []
        this.replacer = []

        let colorFormatter = config?.colorFormatter
        if (colorFormatter)
            this.appendColorFormatter(colorFormatter)

        if (!config?.disableLoadDefaultFormatter) {
            this.loadDefaultColorFormatter()
        }
    }

    appendColorFormatter(colorFormatters) {
        this.colorFormatter.push(
            ...colorFormatters
        )
    }

    loadDefaultColorFormatter() {
        appendColorFormatter(
            this.defaultColorFormatter
        )
    }

    format(/** @type { String } */ str) {
        for (formatter in this.colorFormatter) {
            str = str.replace(formatter[0],formatter[1])
        }
        return str
    }
}
module.exports = logformatter
