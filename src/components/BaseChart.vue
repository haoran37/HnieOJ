<template>
  <div ref="chartRef" :style="{ width: width, height: height }" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, markRaw } from 'vue';
import * as echarts from 'echarts';
import { useResizeObserver } from '@vueuse/core';
import { useAppStore } from '@/stores/app';

const props = defineProps({
  option: { type: Object, required: true },
  width: { type: String, default: '100%' },
  height: { type: String, default: '300px' },
});

const chartRef = ref<HTMLElement | null>(null);
const chartInstance = ref<echarts.ECharts | null>(null);
const appStore = useAppStore();

const initChart = () => {
  if (chartRef.value) {
    chartInstance.value = markRaw(echarts.init(chartRef.value, appStore.darkMode ? 'dark' : undefined));
    chartInstance.value.setOption(props.option);
  }
};

watch(() => props.option, (newVal) => {
  chartInstance.value?.setOption(newVal);
}, { deep: true });

watch(() => appStore.darkMode, (isDark) => {
  if (chartInstance.value) {
    chartInstance.value.dispose();
    initChart();
  }
});

useResizeObserver(chartRef, () => {
  chartInstance.value?.resize();
});

onMounted(() => {
  initChart();
});

onUnmounted(() => {
  chartInstance.value?.dispose();
});
</script>