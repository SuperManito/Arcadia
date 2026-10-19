#!/bin/bash

## 沙箱
function sandbox_main() {
    # sandbox_main 读取的 SANDBOX_* 变量契约：
    #   SANDBOX_ALLOW_READ / SANDBOX_ALLOW_WRITE    追加只读/读写路径（数组）
    #   SANDBOX_NET_DENY_ALL                        完全断网
    #   SANDBOX_NET_ALLOW                           出站白名单规则（数组）
    #   SANDBOX_NET_DENY                            出站黑名单规则（数组）
    #   SANDBOX_NET_DENY_LOCAL                      屏蔽局域网
    #   SANDBOX_HTTP_ALLOW                          HTTP 白名单规则（数组）
    #   SANDBOX_HTTP_DENY                           HTTP 黑名单规则（数组）
    #   SANDBOX_NET_ALLOW_BIND                      允许绑定的 TCP 端口（数组）
    #   SANDBOX_NET_ALLOW_BIND_ALL                  允许绑定任意端口
    #   SANDBOX_MAX_MEMORY                          内存上限
    #   SANDBOX_CLEAR_ENV / SANDBOX_ENV_VARS        清空环境变量 / 追加环境变量（数组）
    #   SANDBOX_ENV_WHITELIST                       仅保留指定变量
    #   SANDBOX_ENV_BLACKLIST                       排除指定变量
    #   SANDBOX_OPTS                                透传给 sandlock 的原始参数（数组）
    local cmd="$1"
    local redirect=""
    local sandbox_dir="${ShellDir}/sandbox"
    local sandbox_bin="${sandbox_dir}/sandlock"
    local _args=()
    local _p _spec _local_range _port _kv _var _rule _opt _a _certifi_path
    local _has_net_allow _has_net_deny
    local _has_net_allow_bind
    local _has_clean_env
    local _raw_has_net_allow _raw_has_net_deny _raw_has_net_allow_bind
    local _raw_has_http_allow _raw_has_http_deny _raw_has_clean_env _raw_has_memory
    local _raw_has_http_inject_ca _raw_has_http_ca_out
    local _ca_out_path=""
    local _opts_item _opts_line
    local _sandlock_args_str=""
    local _sandlock_cmd=""
    local _env_prefix="env"
    local _bl_args=""
    local _ca_env_key _ca_env_managed

    # 检查沙箱依赖，缺失时自动下载安装
    if [[ ! -x "${sandbox_bin}" ]]; then
        local download_url="https://github.com/multikernel/sandlock/releases/latest/download/sandlock-$(arch)-unknown-linux-gnu.tar.gz"
        wget -q --show-progress -O - "${download_url}" | tar -xzf - -C "${sandbox_dir}"
        [ -f "${sandbox_dir}/sandlock" ] && chmod a+x "${sandbox_dir}/sandlock"
        if [[ ! -x "${sandbox_bin}" ]]; then
            output_error "检测到 Sandlock 安装失败，请在检查网络后重试！"
        fi
    fi

    if [[ "${cmd}" == *" 2>&1" ]]; then
        cmd="${cmd% 2>&1}"
        redirect=" 2>&1"
    fi

    # 透传参数展开、检测与用法检查
    if [[ ${#SANDBOX_OPTS[@]} -gt 0 ]]; then
        for _opts_item in "${SANDBOX_OPTS[@]}"; do
            if ! _opts_line="$(printf '%s' "${_opts_item}" | perl -MText::ParseWords -ne 'my @w = shellwords($_); if (!@w && /\S/) { die "parse error\n" } print join(" ", map { my $s=$_; $s =~ s/([\\"\$`])/\\$1/g; "\"$s\"" } @w)' 2>&1)"; then
                output_error "沙箱 ${BLUE}--sandbox-opts${PLAIN} 用法错误，请检查透传参数内容！"
            fi
            [[ -n "${_opts_line}" ]] && eval "_args+=(${_opts_line})"
        done

        # 检测透传参数中的底层选项
        for _opt in "${_args[@]}"; do
            case "${_opt}" in
            --net-allow | --net-allow=*)
                _raw_has_net_allow="true"
                ;;
            --net-deny | --net-deny=*)
                _raw_has_net_deny="true"
                ;;
            --net-allow-bind | --net-allow-bind=*)
                _raw_has_net_allow_bind="true"
                ;;
            --http-allow | --http-allow=*)
                _raw_has_http_allow="true"
                ;;
            --http-deny | --http-deny=*)
                _raw_has_http_deny="true"
                ;;
            --http-inject-ca | --http-inject-ca=*)
                _raw_has_http_inject_ca="true"
                ;;
            --http-ca-out | --http-ca-out=*)
                _raw_has_http_ca_out="true"
                ;;
            --clean-env)
                _raw_has_clean_env="true"
                ;;
            -m | -m=* | --max-memory | --max-memory=*)
                _raw_has_memory="true"
                ;;
            esac
        done

        # opts 用法检查（透传白名单/黑名单可与 deny-local 及对方自由组合，deny 规则由引擎保证优先；同侧与高层重复仍视为配置歧义）
        if [[ "${_raw_has_net_allow}" == "true" && ("${SANDBOX_NET_DENY_ALL}" == "true" || ${#SANDBOX_NET_ALLOW[@]} -gt 0) ]] ||
            [[ "${_raw_has_net_deny}" == "true" && ("${SANDBOX_NET_DENY_ALL}" == "true" || ${#SANDBOX_NET_DENY[@]} -gt 0) ]] ||
            [[ "${_raw_has_net_allow_bind}" == "true" && ("${SANDBOX_NET_ALLOW_BIND_ALL}" == "true" || ${#SANDBOX_NET_ALLOW_BIND[@]} -gt 0) ]] ||
            [[ "${_raw_has_http_allow}" == "true" && ("${_raw_has_http_deny}" == "true" || ${#SANDBOX_HTTP_ALLOW[@]} -gt 0 || ${#SANDBOX_HTTP_DENY[@]} -gt 0) ]] ||
            [[ "${_raw_has_http_deny}" == "true" && ("${_raw_has_http_allow}" == "true" || ${#SANDBOX_HTTP_ALLOW[@]} -gt 0 || ${#SANDBOX_HTTP_DENY[@]} -gt 0) ]] ||
            [[ "${_raw_has_clean_env}" == "true" && ("${SANDBOX_CLEAR_ENV}" == "true" || -n "${SANDBOX_ENV_WHITELIST}" || -n "${SANDBOX_ENV_BLACKLIST}") ]] ||
            [[ "${_raw_has_memory}" == "true" && -n "${SANDBOX_MAX_MEMORY}" ]] ||
            [[ ("${_raw_has_http_allow}" == "true" || "${_raw_has_http_deny}" == "true") && "${SANDBOX_NET_DENY_ALL}" == "true" ]]; then
            output_error "沙箱 ${BLUE}--sandbox-opts${PLAIN} 用法错误，请检查透传参数"
        fi

        # 合并透传参数标记
        [[ "${_raw_has_net_allow}" == "true" ]] && _has_net_allow="true"
        [[ "${_raw_has_net_deny}" == "true" ]] && _has_net_deny="true"
        [[ "${_raw_has_net_allow_bind}" == "true" ]] && _has_net_allow_bind="true"
        [[ "${_raw_has_clean_env}" == "true" ]] && _has_clean_env="true"
    fi

    # 合并高级沙箱配置
    [[ ${#SANDBOX_NET_ALLOW[@]} -gt 0 ]] && _has_net_allow="true"
    [[ ${#SANDBOX_NET_DENY[@]} -gt 0 ]] && _has_net_deny="true"
    [[ ${#SANDBOX_NET_ALLOW_BIND[@]} -gt 0 ]] && _has_net_allow_bind="true"

    # 默认只读路径
    for _p in /usr /etc /proc /dev; do
        [[ -e "${_p}" ]] && _args+=("-r" "${_p}")
    done
    for _p in /lib /lib64 /lib32 /bin /sbin /usr/local; do
        if [[ -e "${_p}" ]] && [[ "$(realpath -m "${_p}" 2>/dev/null)" != /usr/* ]]; then
            _args+=("-r" "${_p}")
        fi
    done
    _args+=("-w" "/tmp")
    _args+=("-w" "${FileDir}")

    # 防止沙箱内代码窃取其它进程的文件描述符或读写其它进程内存（后两者默认已在黑名单，显式声明为加固）
    _args+=("--extra-deny-syscall" "pidfd_getfd")
    _args+=("--extra-deny-syscall" "process_vm_readv")
    _args+=("--extra-deny-syscall" "process_vm_writev")

    # 用户追加路径
    if [[ ${#SANDBOX_ALLOW_WRITE[@]} -gt 0 ]]; then
        for _p in "${SANDBOX_ALLOW_WRITE[@]}"; do
            _args+=("-w" "${_p}")
        done
    fi
    if [[ ${#SANDBOX_ALLOW_READ[@]} -gt 0 ]]; then
        for _p in "${SANDBOX_ALLOW_READ[@]}"; do
            _args+=("-r" "${_p}")
        done
    fi

    # 网络控制（--net-allow 与 --net-deny 可组合使用，deny 规则由引擎保证优先于 allow）
    if [[ "${SANDBOX_NET_DENY_ALL}" == "true" ]]; then
        :
    else
        if [[ "${_has_net_allow}" == "true" ]]; then
            for _spec in "${SANDBOX_NET_ALLOW[@]}"; do
                _args+=("--net-allow" "${_spec}")
            done
        fi
        if [[ "${_has_net_deny}" == "true" || "${SANDBOX_NET_DENY_LOCAL}" == "true" ]]; then
            for _spec in "${SANDBOX_NET_DENY[@]}"; do
                _args+=("--net-deny" "${_spec}")
            done
            if [[ "${SANDBOX_NET_DENY_LOCAL}" == "true" ]]; then
                for _local_range in \
                    "127.0.0.0/8" \
                    "10.0.0.0/8" \
                    "172.16.0.0/12" \
                    "192.168.0.0/16" \
                    "169.254.0.0/16" \
                    "::1/128" \
                    "fc00::/7" \
                    "fe80::/10"; do
                    _args+=("--net-deny" "${_local_range}")
                done
            fi
        elif [[ "${_has_net_allow}" != "true" ]]; then
            # 默认屏蔽本地回环、私网与云元数据地址，其余出站连接正常放行
            for _local_range in \
                "127.0.0.0/8" \
                "10.0.0.0/8" \
                "172.16.0.0/12" \
                "192.168.0.0/16" \
                "169.254.0.0/16" \
                "::1/128" \
                "fc00::/7" \
                "fe80::/10"; do
                _args+=("--net-deny" "${_local_range}")
            done
        fi
    fi

    # 端口绑定（与出站控制独立）
    if [[ "${SANDBOX_NET_ALLOW_BIND_ALL}" == "true" ]]; then
        _args+=("--net-allow-bind" "*")
    elif [[ "${_has_net_allow_bind}" == "true" ]]; then
        for _port in "${SANDBOX_NET_ALLOW_BIND[@]}"; do
            _args+=("--net-allow-bind" "${_port}")
        done
    fi

    # 内存限制
    if [[ -n "${SANDBOX_MAX_MEMORY}" ]]; then
        _args+=("-m" "${SANDBOX_MAX_MEMORY}")
    fi

    # 环境变量
    if [[ "${SANDBOX_CLEAR_ENV}" == "true" ]]; then
        [[ "${_has_clean_env}" != "true" ]] && _args+=("--clean-env")
        if [[ ${#SANDBOX_ENV_VARS[@]} -gt 0 ]]; then
            for _kv in "${SANDBOX_ENV_VARS[@]}"; do
                _args+=("--env" "${_kv}")
            done
        fi
    elif [[ -n "${SANDBOX_ENV_WHITELIST}" ]]; then
        [[ "${_has_clean_env}" != "true" ]] && _args+=("--clean-env")
        for _var in $(echo "${SANDBOX_ENV_WHITELIST}" | sed 's/,/ /g'); do
            if [[ -n "${_var}" ]] && [[ -n "${!_var}" ]]; then
                _args+=("--env" "${_var}=${!_var}")
            fi
        done
        if [[ ${#SANDBOX_ENV_VARS[@]} -gt 0 ]]; then
            for _kv in "${SANDBOX_ENV_VARS[@]}"; do
                _args+=("--env" "${_kv}")
            done
        fi
    else
        if [[ ${#SANDBOX_ENV_VARS[@]} -gt 0 ]]; then
            for _kv in "${SANDBOX_ENV_VARS[@]}"; do
                _args+=("--env" "${_kv}")
            done
        fi
    fi

    # HTTP 请求过滤
    if [[ ${#SANDBOX_HTTP_ALLOW[@]} -gt 0 ]]; then
        for _rule in "${SANDBOX_HTTP_ALLOW[@]}"; do
            _args+=("--http-allow" "${_rule}")
        done
    elif [[ ${#SANDBOX_HTTP_DENY[@]} -gt 0 ]]; then
        for _rule in "${SANDBOX_HTTP_DENY[@]}"; do
            _args+=("--http-deny" "${_rule}")
        done
    fi
    # CA 证书自动处理
    if [[ ${#SANDBOX_HTTP_ALLOW[@]} -gt 0 ]] || [[ ${#SANDBOX_HTTP_DENY[@]} -gt 0 ]] || [[ "${_raw_has_http_allow}" == "true" ]] || [[ "${_raw_has_http_deny}" == "true" ]]; then
        # 注入常见系统 CA 证书文件，覆盖按系统信任库校验的运行时（Go / Rust / Ruby / Lua / curl 等）
        if [[ "${_raw_has_http_inject_ca}" != "true" ]]; then
            for _p in \
                "/etc/ssl/certs/ca-certificates.crt" \
                "/etc/ssl/cert.pem" \
                "/etc/ssl/ca-bundle.pem" \
                "/etc/pki/tls/certs/ca-bundle.crt" \
                "/etc/pki/tls/cacert.pem" \
                "/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem"; do
                if [[ -f "${_p}" ]]; then
                    _args+=("--http-inject-ca" "${_p}")
                fi
            done
        fi
        if [[ "${_raw_has_http_ca_out}" != "true" ]]; then
            case "${JS_AND_TS_EXECUTE_METHOD}" in
            node | tsx | ts-node | bun | deno)
                _ca_out_path="/tmp/.sandlock-ca-$$.pem"
                _args+=("--http-ca-out" "${_ca_out_path}")
                ;;
            esac
        fi
        # 证书变量通过 sandlock --env 注入，--clean-env 清空环境后依然生效
        if [[ -n "${_ca_out_path}" ]]; then
            _ca_env_key="NODE_EXTRA_CA_CERTS"
            [[ "${JS_AND_TS_EXECUTE_METHOD}" == "deno" ]] && _ca_env_key="DENO_CERT"
            _ca_env_managed="false"
            for _kv in "${SANDBOX_ENV_VARS[@]}"; do
                if [[ "${_kv}" == "${_ca_env_key}="* ]]; then
                    _ca_env_managed="true"
                    break
                fi
            done
            if [[ "${_ca_env_managed}" != "true" ]] && [[ ",${SANDBOX_ENV_BLACKLIST//[[:space:]]/}," != *",${_ca_env_key},"* ]]; then
                _args+=("--env" "${_ca_env_key}=${_ca_out_path}")
            fi
        fi
        # Python 自动注入 certifi 的 CA 文件，覆盖 requests / httpx 等自带证书库
        if [[ "${FileType}" == "Python" ]] && [[ "${_raw_has_http_inject_ca}" != "true" ]]; then
            if command -v python3 >/dev/null 2>&1; then
                _certifi_path="$(python3 -c 'import certifi; print(certifi.where())' 2>/dev/null || true)"
                if [[ -n "${_certifi_path}" && -f "${_certifi_path}" ]]; then
                    _args+=("--http-inject-ca" "${_certifi_path}")
                fi
            fi
            # 探测失败时兜底常见安装路径（系统包 / 用户目录 / 项目虚拟环境）
            if [[ -z "${_certifi_path}" || ! -f "${_certifi_path}" ]]; then
                for _p in \
                    /usr/lib/python3*/dist-packages/certifi/cacert.pem \
                    /usr/lib/python3*/site-packages/certifi/cacert.pem \
                    /usr/local/lib/python3*/site-packages/certifi/cacert.pem \
                    ${HOME}/.local/lib/python3*/site-packages/certifi/cacert.pem \
                    ${FileDir}/.venv/lib/python3*/site-packages/certifi/cacert.pem; do
                    if [[ -f "${_p}" ]]; then
                        _args+=("--http-inject-ca" "${_p}")
                    fi
                done
            fi
        fi
    fi

    # 透传参数
    for _a in "${_args[@]}"; do
        _sandlock_args_str="${_sandlock_args_str} $(printf '%q' "${_a}")"
    done

    _sandlock_cmd="${sandbox_bin} run${_sandlock_args_str} -- bash -c $(printf '%q' "${cmd}") 2>${LogTmpDir}/.sandlock-err-$$.log"

    # 环境变量黑名单
    if [[ -n "${SANDBOX_ENV_BLACKLIST}" ]]; then
        for _var in $(echo "${SANDBOX_ENV_BLACKLIST}" | sed 's/,/ /g'); do
            [[ -n "${_var}" ]] && _bl_args="${_bl_args} --unset=$(printf '%q' "${_var}")"
        done
        _SANDBOX_WRAPPED_CMD="${_env_prefix}${_bl_args} ${_sandlock_cmd}${redirect}"
    else
        _SANDBOX_WRAPPED_CMD="${_env_prefix} ${_sandlock_cmd}${redirect}"
    fi
}
