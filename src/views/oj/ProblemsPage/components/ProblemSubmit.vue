<template>
  <div class="submit-container">
    <div class="section-header">
      <div class="title-line">Submit</div>
    </div>
    <n-divider style="margin: 12px 0 24px 0" />

    <n-form
      ref="formRef"
      label-placement="top"
      size="medium"
    >
      <n-form-item label="Language & Compiler">
        <n-select
          v-model:value="language"
          :options="languageOptions"
          placeholder="Select Language"
          class="lang-select"
        />
      </n-form-item>

      <n-form-item label="Source Code">
        <div class="editor-box">
          <codemirror
            v-model="code"
            placeholder="// Write your solution here..."
            :style="{ height: '100%', width: '100%' }"
            :autofocus="true"
            :indent-with-tab="true"
            :tab-size="4"
            :extensions="extensions"
          />
        </div>
      </n-form-item>

      <div class="footer-actions">
        <div class="upload-area">
          <n-upload
            :default-upload="false"
            :max="1"
            @change="handleFileChange"
            class="custom-upload"
          >
            <n-button secondary>
              <template #icon><n-icon><FolderOpenOutline /></n-icon></template>
              Upload File
            </n-button>
          </n-upload>
        </div>

        <div class="submit-area">
          <n-button
            type="primary"
            size="large"
            class="submit-btn"
            @click="handleSubmit"
            :loading="submitting"
          >
            <template #icon>
              <n-icon><PaperPlaneOutline /></n-icon>
            </template>
            Submit
          </n-button>
        </div>
      </div>
    </n-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, type UploadFileInfo } from 'naive-ui';
import { PaperPlaneOutline, FolderOpenOutline } from '@vicons/ionicons5';
import { submitCode, submitCodeFile } from '@/utils/api';

// 按需引入语言
import { Codemirror } from 'vue-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';

const props = defineProps<{
  problemCode: string;
  contestId?: string;
}>();

const router = useRouter();
const message = useMessage();
const submitting = ref(false);

const language = ref('cpp');
const code = ref('');
const uploadedFile = ref<File | null>(null);

// language 取值与判题机 specFor 支持的值一致：cpp / c / java / python
// （go-judge 当前不支持 Go，故不提供该选项）
const languageOptions = [
  { label: 'C++ 17 (g++ -std=c++17)', value: 'cpp' },
  { label: 'C (gcc -std=c11)', value: 'c' },
  { label: 'Java (OpenJDK)', value: 'java' },
  { label: 'Python 3', value: 'python' },
];

const extensions = computed(() => {
  const exts = [];
  switch (language.value) {
    case 'cpp':
    case 'c': exts.push(cpp()); break;
    case 'java': exts.push(java()); break;
    case 'python': exts.push(python()); break;
    default: exts.push(cpp());
  }
  return exts;
});

const handleFileChange = (data: { fileList: UploadFileInfo[] }) => {
  const fileList = data.fileList;
  const fileInfo = fileList && fileList.length > 0 ? fileList[fileList.length - 1] : null;
  
  if (fileInfo?.file) {
    uploadedFile.value = fileInfo.file;
  } else {
    uploadedFile.value = null;
  }
};

const handleSubmit = async () => {
  if (submitting.value) return;
  if (!props.problemCode) {
    message.error('缺少题目编号，无法提交');
    return;
  }

  const isCodeEmpty = !code.value || !code.value.trim();
  const isFileEmpty = !uploadedFile.value;

  if (isCodeEmpty && isFileEmpty) {
    message.warning('Please enter code OR upload a file.');
    return;
  }

  submitting.value = true;
  try {
    const contestId = props.contestId?.trim() || undefined;
    const result = isFileEmpty
      ? await submitCode({
          problemCode: props.problemCode,
          language: language.value,
          code: code.value,
          contestId,
        })
      : await (async () => {
          const form = new FormData();
          form.append('problemCode', props.problemCode);
          form.append('language', language.value);
          if (contestId) form.append('contestId', contestId);
          form.append('file', uploadedFile.value as File);
          return submitCodeFile(form);
        })();

    if (!result?.submissionId) {
      throw new Error('提交失败：后端未返回 submissionId');
    }
    message.success('Submitted successfully!');
    router.push(`/status/${result.submissionId}`);
  } catch (err) {
    message.error(err instanceof Error ? err.message : '提交失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped lang="less">
.section-header {
  margin-bottom: 12px;
  .title-line {
    font-size: 20px;
    font-weight: 600;
    color: #333;
    border-left: 4px solid #2080f0;
    padding-left: 12px;
    line-height: 1.2;
  }
}

.lang-select {
  width: 300px;
}

.editor-box {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  height: 500px;
  background-color: #fff;
  font-size: 14px;
}

.footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.upload-area {
  max-width: auto;
}

.submit-area {
  flex-shrink: 0;
}

.submit-btn {
  width: 120px;
  font-weight: bold;
}
</style>