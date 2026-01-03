<template>
  <div style="padding-bottom: 300px">
    <h1 v-for="i in 100" :key="i">内容 {{ i }}</h1>

    <n-affix :bottom="20">
      <n-button type="primary">
        固定在底部
      </n-button>
    </n-affix>
  </div>
</template>



<script lang="ts" setup name="ContestsPage">
import { ref } from 'vue'

const containerRef = ref<HTMLElement | undefined>(undefined)
</script>

<style scoped>
.test {
  width: 100vw;
  height: 100vw;
}

</style>