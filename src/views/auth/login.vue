<template>
  <div class="auth-page">
    <n-card class="auth-card" title="登录 HNIEOJ">
      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-placement="top"
        @submit.prevent="handleSubmit"
      >
        <n-form-item label="学号/工号" path="uid">
          <n-input
            v-model:value="form.uid"
            placeholder="请输入学号/工号"
            :disabled="loading"
            @keyup.enter="handleSubmit"
          />
        </n-form-item>

        <n-form-item label="密码" path="password">
          <n-input
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
            :disabled="loading"
            @keyup.enter="handleSubmit"
          />
        </n-form-item>

        <n-button type="primary" block attr-type="submit" :loading="loading" :disabled="loading">
          登录
        </n-button>
      </n-form>

      <n-divider />

      <n-space justify="center">
        <n-button quaternary :disabled="loading" @click="router.push('/register')">
          没有账号？去注册
        </n-button>
        <n-button quaternary :disabled="loading" @click="router.push('/')">
          返回首页
        </n-button>
      </n-space>
    </n-card>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStore()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const form = reactive({
  uid: '',
  password: '',
})

const rules: FormRules = {
  uid: [{ required: true, message: '请输入学号/工号', trigger: ['input', 'blur'] }],
  password: [{ required: true, message: '请输入密码', trigger: ['input', 'blur'] }],
}

// 只允许站内路径，防止 redirect 参数被用于外部跳转
function safeRedirect(raw: unknown): string {
  if (typeof raw !== 'string' || raw === '') return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

async function handleSubmit() {
  if (loading.value) return

  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    await userStore.login(form.uid.trim(), form.password)
    message.success('登录成功')
    router.replace(safeRedirect(route.query.redirect))
  } catch (error) {
    message.error(error instanceof Error ? error.message : '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: var(--oj-bg-page);
}

.auth-card {
  width: 100%;
  max-width: 420px;
}
</style>
