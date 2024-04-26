#!/bin/bash
## Modified: 2024-04-27

function main() {
    case $# in
    0)
        print_command_help $ArcadiaCmd
        ;;
    *)
        case $1 in
        run)
            shift
            import run
            command_run "$@"
            ;;
        stop)
            shift
            import stop
            command_stop "$@"
            ;;
        list)
            shift
            import list
            command_list "$@"
            ;;
        ps)
            shift
            import ps
            command_ps "$@"
            ;;
        cleanup)
            shift
            import cleanup
            command_cleanup "$@"
            ;;
        repo)
            shift
            import repo
            command_repo "$@"
            ;;
        raw)
            shift
            import raw
            command_raw "$@"
            ;;
        envm)
            shift
            import envm
            command_envm "$@"
            ;;
        update)
            shift
            import update
            command_update "$@"
            ;;
        upgrade)
            shift
            import upgrade
            command_upgrade "$@"
            ;;
        tgbot)
            shift
            import tgbot
            command_tgbot "$@"
            ;;
        service)
            shift
            import service
            command_service "$@"
            ;;
        rmlog)
            shift
            import rmlog
            command_rmlog "$@"
            ;;
        notify)
            shift
            import notify
            command_notify "$@"
            ;;
        *)
            output_command_error 1 # 命令错误
            ;;
        esac
        ;;
    esac
}

main "$@"
