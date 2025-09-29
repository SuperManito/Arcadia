module.exports = {
    apps: [{
        name: "tgbot",
        version: "1.0.0",
        cwd: "..",
        script: "python3",
        args: "",
        autorestart: true,
        watch: ["tgbot"],
        ignore_watch: [
            "tgbot/__pycache__/*",
            "tgbot/bot/__pycache__/*",
            "tgbot/diy/__pycache__/*",
            "tgbot/*.log",
            "tgbot/*/*.log",
            "tgbot/requirements.txt",
            "tgbot/ecosystem.config.js"
        ],
        watch_delay: 15000,
        interpreter: "/usr/bin/python3",
        interpreter_args: "-m tgbot",
    }]
}
