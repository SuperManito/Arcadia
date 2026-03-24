#!/bin/bash

source $(dirname $(readlink -f "$0"))/core/main.sh

set -e
import init
arcadia_init
tail -f /dev/null
