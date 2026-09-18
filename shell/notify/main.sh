#!/bin/bash

function command_notify() {
    case $# in
    0)
        print_command_help notify
        ;;
    1)
        output_command_error 1
        ;;
    2)
        import message
        push_message "$1" "$2"
        ;;
    3)
        import message
        push_message "$1" "$2" "$3"
        ;;
    *)
        output_command_error 2
        ;;
    esac
}
