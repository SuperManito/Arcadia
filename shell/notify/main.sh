#!/bin/bash
## Modified: 2024-04-18

function command_notify() {
    case $# in
    0)
        print_command_help notify
        ;;
    1)
        output_command_error 1 # 命令错误
        ;;
    2)
        import_config_not_check
        send_notify "$1" "$2"
        ;;
    *)
        output_command_error 2 # 命令过多
        ;;
    esac
}
