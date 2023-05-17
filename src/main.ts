import { createApp, defineComponent } from 'vue'
import App from './App.vue'

import 'vfonts/Inter.css'

const app = createApp(App)
app.component(
  'VNode',
  defineComponent({
    props: ['render'],
    render () {
      return this.render()
    },
  }),
)
app.mount('#app')
