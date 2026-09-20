<template>
  <div class="problem-edit-container">
    <n-spin :show="detailLoading">
      <n-result
        v-if="notFound"
        status="404"
        title="题目不存在"
        description="该题目可能已被删除，或您没有访问权限。"
      >
        <template #footer>
          <n-button @click="handleCancel">返回列表</n-button>
        </template>
      </n-result>

      <template v-else>
        <n-card title="编辑题目" :bordered="false">
          <n-form ref="formRef" :model="problem" :rules="rules" label-placement="left" label-width="130px">
            <n-grid :cols="2" :x-gap="24">
              <n-form-item-gi label="标题" path="title">
                <n-input v-model:value="problem.title" placeholder="请输入题目标题" />
              </n-form-item-gi>
              <n-form-item-gi label="展示编号 (PID)" path="problemCode">
                <n-input v-model:value="problem.problemCode" placeholder="例如 P1001" />
              </n-form-item-gi>
            </n-grid>

            <n-divider title-placement="left">基本配置</n-divider>

            <n-grid :cols="2" :x-gap="24">
              <n-form-item-gi label="判题模式">
                <n-select v-model:value="problem.judgeMode" :options="languageOptions" />
              </n-form-item-gi>
              <n-form-item-gi label="题目类型">
                <n-radio-group v-model:value="problem.type">
                  <n-radio-button :value="0">ACM</n-radio-button>
                  <n-radio-button :value="1">OI</n-radio-button>
                </n-radio-group>
              </n-form-item-gi>
            </n-grid>

            <n-grid :cols="3" :x-gap="24">
              <n-form-item-gi label="时间限制 (ms)">
                <n-input-number v-model:value="problem.timeLimit" :min="1" placeholder="1000" style="width: 100%" />
              </n-form-item-gi>
              <n-form-item-gi label="空间限制 (MB)">
                <n-input-number v-model:value="problem.memoryLimit" :min="1" placeholder="256" style="width: 100%" />
              </n-form-item-gi>
              <n-form-item-gi label="栈限制 (MB)">
                <n-input-number v-model:value="problem.stackLimit" :min="1" placeholder="128" style="width: 100%" />
              </n-form-item-gi>
            </n-grid>

            <n-grid :cols="2" :x-gap="24">
              <n-form-item-gi label="难度">
                <n-select v-model:value="problem.difficulty" :options="difficultyOptions" />
              </n-form-item-gi>
              <n-form-item-gi label="来源">
                <n-input v-model:value="problem.source" placeholder="例如 HNIEOJ 校赛" />
              </n-form-item-gi>
            </n-grid>

            <n-form-item label="标签">
              <n-dynamic-tags v-model:value="tags" />
            </n-form-item>

            <n-grid :cols="3" :x-gap="24">
              <n-form-item-gi label="可见范围">
                <n-select v-model:value="problem.auth" :options="authOptions" />
              </n-form-item-gi>
              <n-form-item-gi label="去除行末空格">
                <n-switch v-model:value="problem.isRemoveEndBlank" />
              </n-form-item-gi>
              <n-form-item-gi label="公开评测结果">
                <n-switch v-model:value="problem.openCaseResult" />
              </n-form-item-gi>
            </n-grid>

            <n-grid :cols="2" :x-gap="24">
              <n-form-item-gi label="OI 总分" v-if="problem.type === 1">
                <n-input-number v-model:value="problem.ioScore" :min="0" style="width: 100%" />
              </n-form-item-gi>
              <n-form-item-gi label="远程题目">
                <n-switch v-model:value="problem.isRemote" />
              </n-form-item-gi>
            </n-grid>

            <template v-if="problem.judgeMode === 'spj'">
              <n-divider title-placement="left">特殊判题 (SPJ) 配置</n-divider>
              <n-grid :cols="3" :x-gap="24">
                <n-form-item-gi label="Checker 语言">
                  <n-input v-model:value="problem.spjLanguage" placeholder="例如 c / cpp" />
                </n-form-item-gi>
                <n-form-item-gi label="时间限制 (ms)">
                  <n-input-number v-model:value="problem.spjTimeLimit" :min="1" style="width: 100%" />
                </n-form-item-gi>
                <n-form-item-gi label="空间限制 (MB)">
                  <n-input-number v-model:value="problem.spjMemoryLimit" :min="1" style="width: 100%" />
                </n-form-item-gi>
              </n-grid>
              <n-grid :cols="3" :x-gap="24">
                <n-form-item-gi label="栈限制 (MB)">
                  <n-input-number v-model:value="problem.spjStackLimit" :min="1" style="width: 100%" />
                </n-form-item-gi>
                <n-form-item-gi label="输出限制 (B)">
                  <n-input-number v-model:value="problem.spjOutputLimit" :min="1" style="width: 100%" />
                </n-form-item-gi>
                <n-form-item-gi label="协议">
                  <n-input v-model:value="problem.spjProtocol" />
                </n-form-item-gi>
              </n-grid>
              <n-form-item label="Checker 源码">
                <n-input v-model:value="problem.spjCode" type="textarea" :autosize="{ minRows: 8, maxRows: 20 }" />
              </n-form-item>
            </template>

            <template v-if="problem.judgeMode === 'interactive'">
              <n-divider title-placement="left">交互题配置</n-divider>
              <n-grid :cols="3" :x-gap="24">
                <n-form-item-gi label="Interactor 语言">
                  <n-input v-model:value="problem.interactorLanguage" placeholder="例如 c / cpp" />
                </n-form-item-gi>
                <n-form-item-gi label="时间限制 (ms)">
                  <n-input-number v-model:value="problem.interactorTimeLimit" :min="1" style="width: 100%" />
                </n-form-item-gi>
                <n-form-item-gi label="空间限制 (MB)">
                  <n-input-number v-model:value="problem.interactorMemoryLimit" :min="1" style="width: 100%" />
                </n-form-item-gi>
              </n-grid>
              <n-grid :cols="3" :x-gap="24">
                <n-form-item-gi label="栈限制 (MB)">
                  <n-input-number v-model:value="problem.interactorStackLimit" :min="1" style="width: 100%" />
                </n-form-item-gi>
                <n-form-item-gi label="输出限制 (B)">
                  <n-input-number v-model:value="problem.interactorOutputLimit" :min="1" style="width: 100%" />
                </n-form-item-gi>
                <n-form-item-gi label="协议">
                  <n-input v-model:value="problem.interactorProtocol" />
                </n-form-item-gi>
              </n-grid>
              <n-form-item label="Interactor 源码">
                <n-input v-model:value="problem.interactorCode" type="textarea" :autosize="{ minRows: 8, maxRows: 20 }" />
              </n-form-item>
            </template>

            <n-divider title-placement="left">题目内容</n-divider>

            <n-form-item label="题目描述">
              <v-md-editor v-model="problem.description" height="400px"></v-md-editor>
            </n-form-item>

            <n-form-item label="输入描述">
              <v-md-editor v-model="problem.input" height="200px"></v-md-editor>
            </n-form-item>

            <n-form-item label="输出描述">
              <v-md-editor v-model="problem.output" height="200px"></v-md-editor>
            </n-form-item>

            <n-form-item label="样例">
              <div class="examples-container">
                <div class="examples-header">
                  <n-grid :cols="24" :x-gap="12">
                    <n-gi :span="11"><span class="header-text">输入样例</span></n-gi>
                    <n-gi :span="11"><span class="header-text">输出样例</span></n-gi>
                    <n-gi :span="2" style="text-align: center;"><span class="header-text">操作</span></n-gi>
                  </n-grid>
                </div>
                <div v-for="(example, index) in problem.examples" :key="index" class="example-item">
                  <n-grid :cols="24" :x-gap="12">
                    <n-gi :span="11">
                      <n-input type="textarea" v-model:value="example.input" placeholder="输入..."
                        :autosize="{ minRows: 2, maxRows: 5 }" />
                    </n-gi>
                    <n-gi :span="11">
                      <n-input type="textarea" v-model:value="example.output" placeholder="输出..."
                        :autosize="{ minRows: 2, maxRows: 5 }" />
                    </n-gi>
                    <n-gi :span="2" class="delete-btn-col">
                      <n-button text type="error" @click="removeExample(index)">
                        <template #icon><n-icon><TrashOutline /></n-icon></template>
                      </n-button>
                    </n-gi>
                  </n-grid>
                </div>
                <n-button dashed block @click="addExample" class="add-example-btn">
                  <template #icon><n-icon><AddOutline /></n-icon></template>
                  添加样例
                </n-button>
              </div>
            </n-form-item>

            <n-form-item label="提示">
              <v-md-editor v-model="problem.hint" height="200px"></v-md-editor>
            </n-form-item>

            <div class="submit-btn">
              <n-space>
                <n-button @click="handleCancel">取消</n-button>
                <n-button type="primary" @click="handleSubmit" :loading="loading">保存修改</n-button>
              </n-space>
            </div>
          </n-form>
        </n-card>

        <n-card title="测试数据与题面图片" :bordered="false" class="resource-card">
          <n-alert v-if="!problem.id" type="warning" :bordered="false" class="mb-4">
            题目内部编号尚未就绪，资源上传暂不可用。
          </n-alert>

          <n-space vertical size="large">
            <div class="resource-block">
              <div class="resource-title">测试数据（ZIP）</div>
              <n-space align="center" :wrap="true">
                <n-upload
                  :show-file-list="false"
                  accept=".zip"
                  :custom-request="uploadTestdataRequest"
                >
                  <n-button type="primary" :loading="savingTestdata" :disabled="!problem.id">上传 ZIP 测试数据</n-button>
                </n-upload>
                <n-button :disabled="!problem.id" @click="handleDownloadTestdata">下载全部测试数据</n-button>
                <n-input-number v-model:value="caseNo" :min="1" placeholder="测试点编号" style="width: 140px" />
                <n-button :disabled="!problem.id" @click="handleDownloadCase">下载单个测试点</n-button>
              </n-space>
            </div>

            <div class="resource-block">
              <div class="resource-title">题面图片</div>
              <n-space vertical size="medium">
                <n-upload
                  :show-file-list="false"
                  accept="image/*"
                  :custom-request="uploadImageRequest"
                >
                  <n-button type="primary" :loading="uploadingImage" :disabled="!problem.id">上传图片并插入题面</n-button>
                </n-upload>
                <div v-if="problemImages.length > 0" class="image-list">
                  <div v-for="filename in problemImages" :key="filename" class="image-item">
                    <img :src="`/oj/images/${problem.id}/${filename}`" :alt="filename" class="image-preview" />
                    <span class="image-name">{{ filename }}</span>
                    <n-button size="tiny" type="error" secondary @click="handleDeleteImage(filename)">删除</n-button>
                  </div>
                </div>
                <n-empty v-else description="题面中暂无图片" />
              </n-space>
            </div>
          </n-space>
        </n-card>
      </template>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { TrashOutline, AddOutline } from '@vicons/ionicons5';
import type { UploadCustomRequestOptions } from 'naive-ui';
import { useProblemForm } from '@/composables/admin/useProblemForm';

const {
  formRef,
  loading,
  detailLoading,
  notFound,
  savingTestdata,
  uploadingImage,
  caseNo,
  problem,
  tags,
  problemImages,
  languageOptions,
  difficultyOptions,
  authOptions,
  rules,
  addExample,
  removeExample,
  handleSubmit,
  handleCancel,
  handleUploadTestdata,
  handleDownloadTestdata,
  handleDownloadCase,
  handleUploadImage,
  handleDeleteImage,
} = useProblemForm();

const uploadTestdataRequest = async ({ file, onFinish, onError }: UploadCustomRequestOptions) => {
  if (!file.file) {
    onError();
    return;
  }
  const ok = await handleUploadTestdata(file.file);
  if (ok) onFinish();
  else onError();
};

const uploadImageRequest = async ({ file, onFinish, onError }: UploadCustomRequestOptions) => {
  if (!file.file) {
    onError();
    return;
  }
  const ok = await handleUploadImage(file.file);
  if (ok) onFinish();
  else onError();
};
</script>

<style scoped lang="less">
.problem-edit-container {
  padding: 20px;
}

.resource-card {
  margin-top: 16px;
}

.mb-4 {
  margin-bottom: 16px;
}

.resource-block {
  .resource-title {
    font-weight: 500;
    margin-bottom: 8px;
  }
}

.image-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-item {
  display: flex;
  align-items: center;
  gap: 12px;

  .image-preview {
    width: 80px;
    height: 60px;
    object-fit: contain;
    border: 1px solid #efeff5;
    border-radius: 4px;
  }

  .image-name {
    flex: 1;
    min-width: 0;
    word-break: break-all;
    color: #666;
    font-size: 13px;
  }
}

.examples-container {
  width: 100%;

  .examples-header {
    margin-bottom: 8px;
    .header-text {
      font-weight: 500;
      color: var(--n-text-color-2);
      font-size: 14px;
    }
  }

  .example-item {
    margin-bottom: 12px;

    .delete-btn-col {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 6px;
    }
  }

  .add-example-btn {
    margin-top: 4px;
  }
}

.submit-btn {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
