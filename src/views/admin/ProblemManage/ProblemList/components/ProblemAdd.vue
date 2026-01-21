<template>
  <div class="problem-add-container">
    <n-card title="添加题目" :bordered="false">
      <n-form ref="formRef" :model="problem" :rules="rules" label-placement="left" label-width="120px">
        
        <n-grid :cols="2" :x-gap="24">
          <n-form-item-gi label="标题" path="problem.title">
            <n-input v-model:value="problem.problem.title" placeholder="请输入题目标题" />
          </n-form-item-gi>
          <n-form-item-gi label="Display ID" path="problem.problemId">
            <n-input v-model:value="problem.problem.problemId" placeholder="请输入题目ID" />
          </n-form-item-gi>
        </n-grid>

        <n-collapse :default-expanded-names="['basic', 'content']">
          <n-collapse-item title="基本配置" name="basic">
            <n-grid :cols="2" :x-gap="24">
              <n-form-item-gi label="判题模式">
                <n-radio-group v-model:value="problem.judgeMode">
                  <n-radio-button value="default">普通判题</n-radio-button>
                  <n-radio-button value="spj">特殊判题</n-radio-button>
                  <n-radio-button value="interactive">交互判题</n-radio-button>
                </n-radio-group>
              </n-form-item-gi>
              <n-form-item-gi label="题目类型">
                <n-radio-group v-model:value="problem.problem.type">
                  <n-radio-button :value="0">ACM</n-radio-button>
                  <n-radio-button :value="1">OI</n-radio-button>
                </n-radio-group>
              </n-form-item-gi>
            </n-grid>

            <n-form-item label="支持语言">
              <n-select v-model:value="problem.languages" multiple :options="languageOptions" placeholder="请选择支持的语言" />
            </n-form-item>

            <n-grid :cols="2" :x-gap="24">
              <n-form-item-gi label="时间限制 (ms)">
                <n-input-number v-model:value="problem.problem.timeLimit" :min="0" placeholder="1000" style="width: 100%" />
              </n-form-item-gi>
              <n-form-item-gi label="空间限制 (MB)">
                <n-input-number v-model:value="problem.problem.memoryLimit" :min="0" placeholder="256" style="width: 100%" />
              </n-form-item-gi>
            </n-grid>

            <n-grid :cols="2" :x-gap="24">
              <n-form-item-gi label="难度">
                <n-select v-model:value="problem.problem.difficulty" :options="difficultyOptions" />
              </n-form-item-gi>
              <n-form-item-gi label="来源">
                <n-input-group>
                  <n-select v-model:value="problem.problem.source" multiple :show-arrow="false" placeholder="请选择来源"
                    class="readonly-select" />
                  <n-button type="primary" @click="showSourceModal = true">选择来源</n-button>
                </n-input-group>
              </n-form-item-gi>
            </n-grid>

            <n-form-item label="标签">
              <n-input-group>
                <n-select v-model:value="problem.tags" multiple :show-arrow="false" placeholder="请选择标签"
                  class="readonly-select" />
                <n-button type="primary" @click="showAlgorithmModal = true">选择标签</n-button>
              </n-input-group>
            </n-form-item>

            <n-grid :cols="3" :x-gap="24">
              <n-form-item-gi label="公开状态">
                <n-switch v-model:value="problem.problem.auth" :checked-value="1" :unchecked-value="2">
                  <template #checked>公开</template>
                  <template #unchecked>私有</template>
                </n-switch>
              </n-form-item-gi>
              <n-form-item-gi label="去除行末空格">
                <n-switch v-model:value="problem.problem.isRemoveEndBlank" />
              </n-form-item-gi>
              <n-form-item-gi label="公开评测结果">
                <n-switch v-model:value="problem.problem.openCaseResult" />
              </n-form-item-gi>
            </n-grid>

            <n-form-item label="OI总分" v-if="problem.problem.type === 1">
              <n-input-number v-model:value="problem.problem.ioScore" :min="0" placeholder="100" style="width: 100%" />
            </n-form-item>
          </n-collapse-item>

          <n-collapse-item title="题目内容" name="content">
            <n-form-item label="题目描述">
              <v-md-editor v-model="problem.problem.description" height="400px"></v-md-editor>
            </n-form-item>

            <n-form-item label="输入描述">
              <v-md-editor v-model="problem.problem.input" height="200px"></v-md-editor>
            </n-form-item>

            <n-form-item label="输出描述">
              <v-md-editor v-model="problem.problem.output" height="200px"></v-md-editor>
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
                <div v-for="(example, index) in problem.problem.examples" :key="index" class="example-item">
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
                      <n-button text type="error" @click="removeExample(index)" v-if="problem.problem.examples.length > 1">
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
              <v-md-editor v-model="problem.problem.hint" height="200px"></v-md-editor>
            </n-form-item>
          </n-collapse-item>
        </n-collapse>

        <div class="submit-btn">
          <n-button type="primary" size="large" @click="handleSubmit" :loading="loading">提交</n-button>
        </div>
      </n-form>
    </n-card>

    <TagSelectModal v-model:show="showSourceModal" v-model="problem.problem.source" mode="source" multiple />
    <TagSelectModal v-model:show="showAlgorithmModal" v-model="problem.tags" mode="algorithm" multiple />
  </div>
</template>

<script setup lang="ts">
import { TrashOutline, AddOutline } from '@vicons/ionicons5';
import { useProblemForm } from '@/composables/admin/useProblemForm';
import TagSelectModal from '@/components/TagSelectModal.vue';

const {
  formRef,
  loading,
  languageOptions,
  difficultyOptions,
  problem,
  rules,
  addExample,
  removeExample,
  showSourceModal,
  showAlgorithmModal,
  handleSubmit
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

:deep(.readonly-select) {
  pointer-events: none;
}

:deep(.readonly-select .n-tag) {
  pointer-events: auto;
}
</style>
