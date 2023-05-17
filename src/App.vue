<template>
  <n-config-provider :theme="theme">
    <IssuePage />
  </n-config-provider>
</template>

<script lang="ts">
import {
  NConfigProvider,
  useOsTheme,
  darkTheme,
} from 'naive-ui'
import IssuePage from './components/index.vue'

export default defineComponent({
  name: 'App',
  components: {
    IssuePage,
    NConfigProvider,
  },
  setup () {
    const theme = useOsTheme()

    return {
      theme: computed(() => (theme.value === 'dark' ? darkTheme : null)),
    }
  },
})
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  min-width: 320px;
  --header-height: 64px;
  --content-width: 900px;
  --content-max-width: calc(100vw - 32px);
}

body {
  overflow: auto;
  -webkit-font-smoothing: antialiased;
}

a {
  text-decoration: none;
}

.n-card.modal-card {
  width: calc(var(--content-width) + 32px);
  max-width: 600px;
  margin-top: 32px;
  margin-bottom: 32px;
}
</style>
