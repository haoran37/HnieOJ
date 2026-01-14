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
            action="https://www.mocky.io/v2/5e4bafc63100007100d8b70f"
            :headers="{ 'naive-info': 'hello!' }"
            :data="{ 'naive-data': 'cool! naive!' }"
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

// 按需引入语言
import { Codemirror } from 'vue-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { go } from '@codemirror/lang-go';

const router = useRouter();
const message = useMessage();
const submitting = ref(false);

const language = ref('cpp');
const code = ref('');
const uploadedFile = ref<File | null>(null);

const languageOptions = [
  { label: 'C++ 17 (g++ 9.4.0)', value: 'cpp' },
  { label: 'C (gcc 9.4.0)', value: 'c' },
  { label: 'Java (OpenJDK 11)', value: 'java' },
  { label: 'Python 3 (3.8.10)', value: 'python' },
  { label: 'Go (1.18)', value: 'go' }
];

const extensions = computed(() => {
  const exts = [];
  switch (language.value) {
    case 'cpp':
    case 'c': exts.push(cpp()); break;
    case 'java': exts.push(java()); break;
    case 'python': exts.push(python()); break;
    case 'go': exts.push(go()); break;
    default: exts.push(cpp());
  }
  return exts;
});

const handleFileChange = (data: { fileList: UploadFileInfo[] }) => {
  const fileList = data.fileList;
  const fileInfo = fileList && fileList.length > 0 ? fileList[fileList.length - 1] : null;
  
  if (fileInfo?.file) {
    uploadedFile.value = fileInfo.file;
    console.log('[Behavior] File selected:', uploadedFile.value.name);
  } else {
    uploadedFile.value = null;
  }
};

const handleSubmit = () => {
  const isCodeEmpty = !code.value || !code.value.trim();
  const isFileEmpty = !uploadedFile.value;

  if (isCodeEmpty && isFileEmpty) {
    message.warning('Please enter code OR upload a file.');
    return;
  }

  submitting.value = true;

  console.log('--- [API Placeholder] Submitting Solution ---');
  console.log('Language:', language.value);
  if (!isCodeEmpty) {
    console.log('Type: Code Text, Length:', code.value.length);
    console.log('Code Content:', code.value);
  }
  if (!isFileEmpty) console.log('Type: File Upload, Name:', uploadedFile.value?.name);

  setTimeout(() => {
    submitting.value = false;
    message.success('Submitted successfully!');
    router.push('/status'); //TODO: 带参
  }, 1000);
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