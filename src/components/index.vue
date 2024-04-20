<template>
  <n-config-provider :theme-overrides="theme === null ? lightThemeOverrides : darkThemeOverrides" :locale="locale" :theme="theme">
    <n-message-provider>
      <n-layout :native-scrollbar="false" style="height: 100vh" content-style="height: 100%">
        <n-layout-header bordered class="nav" :lang="lang" @langChange="setLang">
          <div class="nav-box">
            <n-text tag="div" class="ui-logo" :depth="1">
              <img v-if="!theme" src="../img/arcadia-light.png" />
              <img v-else src="../img/arcadia-dark.png" />
            </n-text>
            <n-space style="gap: 0">
              <n-popselect v-model:value="lang" :options="PopselectOptions" trigger="click" :on-update:value="handleLanguageSelect">
                <n-button quaternary size="small" class="nav-picker" :focusable="false">
                  <template #icon>
                    <n-icon><LanguageIcon /></n-icon>
                  </template>
                </n-button>
              </n-popselect>

              <n-button v-if="!theme" quaternary strong size="small" :focusable="false" @click="theme = darkTheme">
                <template #icon>
                  <n-icon><MoonIcon /></n-icon>
                </template>
              </n-button>

              <n-button v-else quaternary strong size="small" :focusable="false" @click="theme = null">
                <template #icon>
                  <n-icon :size="20"><SunIcon /></n-icon>
                </template>
              </n-button>
            </n-space>
          </div>
        </n-layout-header>
        <n-layout-content style="height: calc(100% - 64px)" :native-scrollbar="false" embedded>
          <div class="content-box">
            <div class="content"><Intro :lang="lang" /></div>
            <div class="content"><IssueForm :lang="lang" /></div>
          </div>
        </n-layout-content>
      </n-layout>
    </n-message-provider>
  </n-config-provider>
</template>

<script lang="ts">
import { NLayoutHeader, NText, NIcon, NButton, NLayout, NPopselect, NConfigProvider, GlobalThemeOverrides, darkTheme, zhCN, NMessageProvider, SelectOption, GlobalTheme } from 'naive-ui'
import { Language as LanguageIcon } from '@vicons/ionicons5'
import { Moon as MoonIcon, Sun as SunIcon } from '@vicons/tabler'
import Tiny from 'tinycolor2'
import Intro from './TopIntro.vue'
import IssueForm from './IssueForm.vue'
import { getQuery, updateQuery } from './utils'

export default defineComponent({
  name: 'IssuePage',
  components: {
    Intro,
    IssueForm,
    NLayout,
    NConfigProvider,
    NLayoutHeader,
    NText,
    NIcon,
    NButton,
    NPopselect,
    LanguageIcon,
    SunIcon,
    MoonIcon,
    NMessageProvider,
  },
  setup: () => {
    const lang = ref<'en-US' | 'zh-CN'>('zh-CN')
    const locale = ref<undefined | typeof zhCN>(undefined)
    const theme = ref<GlobalTheme | null>(null)
    const PopselectOptions = [
      {
        label: '简体中文',
        value: 'zh-CN',
      },
      {
        label: 'English',
        value: 'en-US',
      },
    ]
    const handleLanguageSelect = (
      value : Array<any> | string | number | null,
      _option: SelectOption | null | SelectOption[],
    ) => {
      setLang(value as any)
    }

    const setLang = (value: 'en-US' | 'zh-CN') => {
      lang.value = value
      locale.value = value === 'en-US' ? undefined : zhCN
      updateQuery({ lang: value })
    }

    // init 初始化语言
    const param = getQuery()
    if (!param?.lang) {
      updateQuery({ lang: lang.value })
    } else {
      setLang(param.lang)
    }

    // back, forward
    window.addEventListener('popstate', () => {
      lang.value = getQuery()?.lang || 'en-US'
    })
    const lightThemeOverrides: GlobalThemeOverrides = {
      common: {
        primaryColor: Tiny('#2080f0').toHex8String(),
        primaryColorHover: Tiny('#2080f0').lighten(7.5).brighten(1).desaturate(20).spin(-2).toHex8String(),
        primaryColorPressed: Tiny('#2080f0').darken(10).saturate(8).spin(2).toHex8String(),
        primaryColorSuppl: Tiny('#2080f0').lighten(7.5).brighten(1).desaturate(20).spin(-2).toHex8String(),
        fontSize: '15px',
        fontSizeMedium: '15px',
        fontSizeLarge: '16px',
        successColor: 'rgb(24, 160, 88)',
        inputColor: 'rgb(242, 243, 245)',
      },
      Button: {
        colorHover: 'rgba(90, 157, 226, 0.1)',
        borderRadiusTiny: '6px',
        borderRadiusSmall: '6px',
        borderRadiusMedium: '6px',
        borderRadiusLarge: '6px',
      },
      Input: {
        colorFocus: 'rgb(255, 255, 255)',
        borderRadius: '6px',
      },
      Layout: {
        colorEmbedded: 'rgb(242, 243, 245)',
      },
      Tooltip: {
        borderRadius: '10px',
        padding: '6px 10px',
      },
      Popover: {
        borderRadius: '5px',
      },
      Notification: {
        borderRadius: '12px',
      },
      Dropdown: {
        borderRadius: '5px',
      },
      LoadingBar: {
        colorLoading: '#2080f0',
      },
      Message: {
        padding: '8px 12px',
        borderRadius: '6px',
      },
      Checkbox: {
        borderRadius: '4px',
      },
      Tag: {
        borderRadius: '4px',
      },
      Dialog: {
        borderRadius: '10px',
      },
      Radio: {
        buttonColorActive: '#2080f0',
        buttonTextColorActive: 'rgb(255, 255, 255)',
        buttonBorderRadius: '6px',
      },
      Alert: {
        borderRadius: '6px',
      },
      Pagination: {
        itemColorHover: '#2080f0',
      },
      Tree: {
        nodeWrapperPadding: '2px 0px',
      },
      Select: {
        peers: {
          InternalSelection: {
            borderRadius: '6px',
          },
        },
      },
      TreeSelect: {
        menuBorderRadius: '5px',
        peers: {
          Tree: {
            nodeWrapperPadding: '2px 8px',
          },
        },
      },
      Typography: {
        headerMargin3: '24px 0 4px 0',
      },
      Card: {
        titleFontSizeMedium: '20px',
      },
      Form: {
        labelFontSizeTopLarge: '15px',
      },
    }

    const darkThemeOverrides: GlobalThemeOverrides = {
      common: {
        primaryColor: Tiny('#56b8f5').toHex8String(),
        primaryColorHover: Tiny('#56b8f5').lighten(7.5).brighten(1).desaturate(20).spin(-2).toHex8String(),
        primaryColorPressed: Tiny('#56b8f5').darken(10).saturate(8).spin(2).toHex8String(),
        primaryColorSuppl: Tiny('#56b8f5').lighten(7.5).brighten(1).desaturate(20).spin(-2).toHex8String(),
        fontSize: '15px',
        fontSizeMedium: '15px',
        fontSizeLarge: '16px',
        successColor: 'rgb(82, 196, 56)',
        inputColor: 'rgba(255,255,255,0.08)',
      },
      Button: {
        colorHover: 'rgba(86, 184, 245, 0.1)',
        borderRadiusTiny: '6px',
        borderRadiusSmall: '6px',
        borderRadiusMedium: '6px',
        borderRadiusLarge: '6px',
      },
      Input: {
        colorFocus: 'rgb(24, 24, 28)',
        borderRadius: '6px',
      },
      Layout: {
        color: 'rgb(24, 24, 28)',
      },
      Tooltip: {
        borderRadius: '10px',
        padding: '6px 10px',
      },
      Dropdown: {
        color: 'rgb(42, 42, 48)',
        borderRadius: '5px',
      },
      Popover: {
        borderRadius: '5px',
        color: 'rgb(42, 42, 48)',
      },
      Notification: {
        color: 'rgb(42, 42, 48)',
        borderRadius: '12px',
      },
      LoadingBar: {
        colorLoading: '#56b8f5',
      },
      Message: {
        padding: '8px 12px',
        borderRadius: '6px',
        color: 'rgb(42, 42, 48)',
        colorInfo: 'rgb(42, 42, 48)',
        colorSuccess: 'rgb(42, 42, 48)',
        colorError: 'rgb(42, 42, 48)',
        colorWarning: 'rgb(42, 42, 48)',
        colorLoading: 'rgb(42, 42, 48)',
      },
      Checkbox: {
        borderRadius: '4px',
      },
      Switch: {
        railColorActive: '#56b8f5',
      },
      Tag: {
        borderRadius: '4px',
      },
      Dialog: {
        borderRadius: '10px',
      },
      Radio: {
        buttonBorderRadius: '6px',
      },
      Alert: {
        borderRadius: '6px',
      },
      Pagination: {
        itemColorHover: 'var(--app-hover-color)',
        peers: {
          Select: {
            peers: {
              InternalSelectMenu: {
                color: 'rgb(42, 42, 48)',
              },
            },
          },
        },
      },
      Tree: {
        nodeWrapperPadding: '2px 0px',
      },
      Select: {
        peers: {
          InternalSelection: {
            borderRadius: '6px',
          },
        },
      },
      TreeSelect: {
        menuColor: 'rgb(28, 28, 32)',
        menuBorderRadius: '5px',
        peers: {
          Tree: {
            nodeWrapperPadding: '2px 8px',
          },
        },
      },
      Typography: {
        headerMargin3: '24px 0 4px 0',
      },
      Card: {
        titleFontSizeMedium: '20px',
      },
      Form: {
        labelFontSizeTopLarge: '15px',
      },
    }

    return {
      theme,
      lang,
      setLang,
      locale,
      darkTheme,
      lightThemeOverrides,
      darkThemeOverrides,
      PopselectOptions,
      handleLanguageSelect,
    }
  },
})
</script>

<style scoped>
.content-box {
  margin: auto;
  width: var(--content-width);
  max-width: var(--content-max-width);
}

.content {
  margin-top: 24px;
}
.nav {
  height: calc(var(--header-height) - 1px);
  display: flex;
  justify-content: center;
}

.nav-box {
  display: flex;
  justify-content: space-between;
  margin: auto;
  width: var(--content-width);
  max-width: var(--content-max-width);
}

.ui-logo {
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 18px;
}

.ui-logo > img {
  margin-right: 12px;
  height: 26px;
  width: 144px;
}
</style>
