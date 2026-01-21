<template>
  <n-modal :show="show" @update:show="$emit('update:show', $event)" preset="card" style="width: 850px"
    :title="title" :auto-focus="false">
    <n-spin :show="loading">
      <n-tabs type="line" animated>
        <n-tab-pane v-for="cat in filteredTagData" :key="cat.id" :name="cat.id" :tab="cat.name">
          <n-scrollbar style="max-height: 450px">
            <div class="tag-modal-scroll-content">
              <div v-for="group in cat.groups" :key="group.title" class="tag-group-section">
                <div class="group-title">{{ group.title }}</div>
                <n-space :size="[8, 12]">
                  <n-button v-for="tag in group.tags" :key="tag" size="tiny"
                    :type="isSelected(tag, cat.id) ? 'primary' : 'default'" @click="toggleTag(tag, cat.id)">
                    {{ tag }}
                  </n-button>
                </n-space>
              </div>
            </div>
          </n-scrollbar>
        </n-tab-pane>
      </n-tabs>
    </n-spin>
    <template #footer>
      <div style="text-align: right">
        <n-button type="primary" @click="handleConfirm">确认选择</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useTags } from '@/composables/useTags';

const props = defineProps<{
  show: boolean;
  modelValue?: string | string[]; // 用于单模式
  source?: string[]; // 用于混合模式
  tags?: string[]; // 用于混合模式
  mode: 'algorithm' | 'source' | 'all'; // 过滤模式
  multiple?: boolean; // 是否多选（仅对单模式有效，混合模式默认多选）
}>();

const emit = defineEmits(['update:show', 'update:modelValue', 'update:source', 'update:tags', 'confirm']);

const { tagData, loading, fetchTags } = useTags();

// 本地选中的标签
const localSelected = ref<string[]>([]);
const localSource = ref<string[]>([]);
const localTags = ref<string[]>([]);

// 同步 props 到本地
watch(() => props.show, (val) => {
  if (val) {
    fetchTags();
    if (props.mode === 'all') {
      localSource.value = [...(props.source || [])];
      localTags.value = [...(props.tags || [])];
    } else {
      if (Array.isArray(props.modelValue)) {
        localSelected.value = [...props.modelValue];
      } else if (props.modelValue) {
        localSelected.value = [props.modelValue];
      } else {
        localSelected.value = [];
      }
    }
  }
});

const title = computed(() => {
  if (props.mode === 'source') return '选择来源';
  if (props.mode === 'algorithm') return '选择标签';
  return '筛选条件';
});

// 根据 mode 过滤 tagData
const filteredTagData = computed(() => {
  if (!tagData.value) return [];
  if (props.mode === 'source') {
    return tagData.value.filter((cat: any) => cat.id === 'source');
  } else if (props.mode === 'algorithm') {
    return tagData.value.filter((cat: any) => cat.id !== 'source');
  } else {
    // all 模式，显示所有
    return tagData.value;
  }
});

const isSelected = (tag: string, catId: string) => {
  if (props.mode === 'all') {
    if (catId === 'source') {
      return localSource.value.includes(tag);
    } else {
      return localTags.value.includes(tag);
    }
  } else {
    return localSelected.value.includes(tag);
  }
};

const toggleTag = (tag: string, catId: string) => {
  if (props.mode === 'all') {
    if (catId === 'source') {
      const index = localSource.value.indexOf(tag);
      if (index > -1) localSource.value.splice(index, 1);
      else localSource.value.push(tag);
    } else {
      const index = localTags.value.indexOf(tag);
      if (index > -1) localTags.value.splice(index, 1);
      else localTags.value.push(tag);
    }
  } else {
    if (props.multiple) {
      const index = localSelected.value.indexOf(tag);
      if (index > -1) localSelected.value.splice(index, 1);
      else localSelected.value.push(tag);
    } else {
      localSelected.value = [tag];
    }
  }
};

const handleConfirm = () => {
  if (props.mode === 'all') {
    emit('update:source', localSource.value);
    emit('update:tags', localTags.value);
  } else {
    if (props.multiple) {
      emit('update:modelValue', localSelected.value);
    } else {
      emit('update:modelValue', localSelected.value[0] || '');
    }
  }
  emit('confirm');
  emit('update:show', false);
};

onMounted(() => {
  fetchTags();
});
</script>

<style scoped lang="less">
.tag-group-section {
  margin-bottom: 20px;

  .group-title {
    font-weight: bold;
    margin-bottom: 12px;
    border-left: 4px solid #2080f0;
    padding-left: 10px;
  }
}
</style>
