<template>
  <n-card :title="contentText.introTitle" hoverable>
    <v-node :render="contentText.introOne" />

    <n-alert
      :title="contentText.introWarningTitle"
      type="warning"
      style="margin-bottom: 16px"
      closable
    >
      <v-node :render="contentText.introWarningContent" />
    </n-alert>

    <n-button size="tiny" quaternary type="primary" :focusable="false" @click="introVisible = true">
      {{ contentText.explainTitle }}
    </n-button>

    <v-node :render="contentText.introTwo" />

    <n-modal v-model:show="introVisible" :auto-focus="false">
      <n-card
        class="modal-card"
        :title="contentText.explainTitle"
        closable
        @close="introVisible = false"
      >
        <v-node :render="contentText.explain" />
      </n-card>
    </n-modal>
  </n-card>
</template>

<script lang="ts">
import content from '../content.js'

export default defineComponent({
  props: {
    lang: {
      type: String as PropType<'en-US' | 'zh-CN'>,
    },
  },
  setup: (props) => {
    const lang = toRef(props, 'lang')
    const contentText = computed(() => content[lang.value])
    const introVisible: Ref<boolean> = ref(false)
    return { contentText, introVisible }
  },
})
</script>

<style scoped></style>
