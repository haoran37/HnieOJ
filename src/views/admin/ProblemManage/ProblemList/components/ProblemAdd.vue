<template>
  <div class="problem-add-container">
    <n-card title="添加题目" :bordered="false">
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
            <n-button type="primary" size="large" @click="handleSubmit" :loading="loading">提交</n-button>
          </n-space>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { TrashOutline, AddOutline } from '@vicons/ionicons5';
import { useProblemForm } from '@/composables/admin/useProblemForm';

const {
  formRef,
  loading,
  problem,
  tags,
  languageOptions,
  difficultyOptions,
  authOptions,
  rules,
  addExample,
  removeExample,
  handleSubmit,
  handleCancel,
} = useProblemForm();
</script>

<style scoped lang="less">
.problem-add-container {
  padding: 20px;
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
