#!/bin/bash

function has_pm2_service() {
    local service_name="$1"
    pm2 jlist | jq -e --arg name "${service_name}" 'any(.[]; .name == $name)' >/dev/null
}

function get_pm2_service_status() {
    local service_name="$1"
    pm2 jlist | jq -r --arg name "${service_name}" '.[] | select(.name == $name) | .pm2_env.status'
}
