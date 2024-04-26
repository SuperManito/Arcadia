#!/bin/bash

source $(dirname $(readlink -f "$0"))/core/main.sh
source $(dirname $(readlink -f "$0"))/main.sh "$@"
