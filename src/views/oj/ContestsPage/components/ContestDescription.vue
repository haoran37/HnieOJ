<template>
  <div class="contest-description">
    <n-card :bordered="false" style="margin-bottom: 12px">
      <n-spin :show="loading">
        <n-alert v-if="error" type="error" style="margin-bottom: 8px">{{ error }}</n-alert>
        <n-tag v-if="registered" type="success">已报名</n-tag>
        <span v-else-if="!detail.isPublic">邀请制比赛：请联系管理员获取参赛资格</span>
        <n-button v-else-if="!ended" type="primary" :loading="registering" @click="register">报名比赛</n-button>
        <span v-else>比赛已结束</span>
      </n-spin>
    </n-card>
    <n-card :bordered="false" class="desc-card">
      <v-md-preview :text="detail.description || '> 暂无比赛说明'"></v-md-preview>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import type { ContestDetail } from '@/composables/oj/useContestDetail';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { getContestRegistration, registerContest } from '@/utils/api';

const props = defineProps<{
  detail: ContestDetail
}>();
const message = useMessage();
const registered = ref(false);
const loading = ref(false);
const registering = ref(false);
const error = ref('');
const now = ref(Date.now());
const ended = computed(() => !!props.detail.endTime && now.value >= new Date(props.detail.endTime).getTime());
let timer: ReturnType<typeof setInterval> | null = null;
onMounted(() => { timer = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => { if (timer !== null) clearInterval(timer); });
let seq = 0;
watch(() => props.detail.id, async id => {
  const current = ++seq;
  registered.value = false;
  registering.value = false;
  if (!id) return;
  loading.value = true;
  error.value = '';
  try {
    const value = await getContestRegistration(id);
    if (current === seq) registered.value = value;
  } catch (cause) {
    if (current === seq) error.value = cause instanceof Error ? cause.message : '读取报名状态失败';
  } finally { if (current === seq) loading.value = false; }
}, { immediate: true });
const register = async () => {
  const id = props.detail.id;
  if (!id || registering.value) return;
  const current = ++seq;
  registering.value = true;
  try {
    await registerContest(id);
    if (current === seq && id === props.detail.id) {
      registered.value = true;
      message.success('报名成功');
    }
  } catch (cause) {
    if (current === seq && id === props.detail.id) message.error(cause instanceof Error ? cause.message : '报名失败');
  } finally { if (current === seq) registering.value = false; }
};
</script>

<style scoped lang="less">
.desc-card {
  min-height: 400px;
  
  :deep(.github-markdown-body) {
    padding: 0 !important; 
    font-size: 16px;
  }
}
</style>
