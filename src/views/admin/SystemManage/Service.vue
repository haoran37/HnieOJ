<template>
  <n-result
    status="warning"
    title="开发中，敬请期待"
    :description="content"
  >
    <template #footer>
      <n-button @click="clickfun" v-if="show">
        点击催促
      </n-button>
    </template>
  </n-result>
</template>

<script lang="ts" setup name="">
import { ref, h } from 'vue'
import { NImage, useNotification } from 'naive-ui'

const notification = useNotification()

const content = ref('')
const cnt = ref(0)
const show = ref(true)

function clickfun() {
  cnt.value++

  if (cnt.value === 1) content.value = '知道了知道了'
  else if (cnt.value === 5) content.value = '真的知道了！'
  else if (cnt.value >= 10 && cnt.value <= 15) content.value = '那你按吧'
  else if (cnt.value > 15 && cnt.value < 50) content.value = cnt.value.toString()
  else if (cnt.value >= 50 && cnt.value < 55) content.value = '再按达斯 (*￣︿￣)'
  else if (cnt.value >= 70 && cnt.value < 75) content.value = '试试按到1000?'
  else if (cnt.value >= 75 && cnt.value < 500) content.value = cnt.value.toString()
  else if (cnt.value >= 500 && cnt.value < 505) content.value = '加油'
  else if (cnt.value >= 505 && cnt.value < 1000) content.value = cnt.value.toString()
  else if (cnt.value == 1000) {
    content.value = '行吧行吧，给你个彩蛋'
    show.value = false
    showEasterEgg()
  }
}

function showEasterEgg() {
  notification.create({
    title: '🎉 你真的点了 1000 次',
    content: () =>
      h('div', { style: 'text-align: center' }, [
        h(NImage, {
          width: 300,
          src: 'https://s11.ax1x.com/2023/04/27/p9QuT2R.jpg',
          previewDisabled: true
        }),
        h(
          'div',
          {
            style:
              'margin-top: 12px; font-size: 14px; color: #666;'
          },
        )
      ]),
    meta: 'Easter Egg',
    duration: 0
  })
}
</script>
