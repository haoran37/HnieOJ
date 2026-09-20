<template>
  <div class="auth-page">
    <n-card class="auth-card" title="注册 HNIEOJ">
      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-placement="top"
        @submit.prevent="handleSubmit"
      >
        <n-form-item label="学号/工号" path="uid">
          <n-input v-model:value="form.uid" placeholder="请输入学号/工号" :disabled="submitting" />
        </n-form-item>

        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" placeholder="请输入用户名" :disabled="submitting" />
        </n-form-item>

        <n-form-item label="密码" path="password">
          <n-input
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
            :disabled="submitting"
          />
        </n-form-item>

        <n-form-item label="邮箱" path="email">
          <n-input v-model:value="form.email" placeholder="请输入邮箱" :disabled="submitting" />
        </n-form-item>

        <n-form-item label="QQ" path="qq">
          <n-input v-model:value="form.qq" placeholder="请输入 QQ 号" :disabled="submitting" />
        </n-form-item>

        <n-form-item label="学院" path="collegeId">
          <n-select
            v-model:value="form.collegeId"
            :options="collegeOptions"
            :loading="loadingColleges"
            :disabled="submitting"
            placeholder="请选择学院"
            @update:value="handleCollegeChange"
          />
        </n-form-item>

        <n-form-item label="年级" path="grade">
          <n-select
            v-model:value="form.grade"
            :options="gradeOptions"
            :loading="loadingGrades"
            :disabled="submitting || form.collegeId === null"
            placeholder="请选择年级"
            @update:value="handleGradeChange"
          />
        </n-form-item>

        <n-form-item label="班级" path="classId">
          <n-select
            v-model:value="form.classId"
            :options="classOptions"
            :loading="loadingClasses"
            :disabled="submitting || form.grade === null"
            placeholder="请选择班级"
          />
        </n-form-item>

        <n-button type="primary" block attr-type="submit" :loading="submitting" :disabled="submitting">
          提交注册申请
        </n-button>
      </n-form>

      <n-divider />

      <n-space justify="center">
        <n-button quaternary :disabled="submitting" @click="router.push('/login')">
          已有账号？去登录
        </n-button>
        <n-button quaternary :disabled="submitting" @click="router.push('/')">
          返回首页
        </n-button>
      </n-space>
    </n-card>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import { getClasses, getColleges, getGrades, register } from '@/utils/api'
import type { ClassOption, CollegeOption, GradeOption } from '@/types/user'

const router = useRouter()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const submitting = ref(false)

const colleges = ref<CollegeOption[]>([])
const grades = ref<GradeOption[]>([])
const classes = ref<ClassOption[]>([])
const loadingColleges = ref(false)
const loadingGrades = ref(false)
const loadingClasses = ref(false)

// 竞态保护：快速切换学院/年级时，只有最新一次请求的响应可以写入选项
let gradesRequestSeq = 0
let classesRequestSeq = 0

const form = reactive({
  uid: '',
  username: '',
  password: '',
  email: '',
  qq: '',
  collegeId: null as number | null,
  grade: null as string | null,
  classId: null as number | null,
})

const collegeOptions = computed(() => colleges.value.map((item) => ({ label: item.name, value: item.id })))
const gradeOptions = computed(() => grades.value.map((item) => ({ label: item.grade, value: item.grade })))
const classOptions = computed(() => classes.value.map((item) => ({ label: item.name, value: item.id })))

const rules: FormRules = {
  uid: [{ required: true, message: '请输入学号/工号', trigger: ['input', 'blur'] }],
  username: [{ required: true, message: '请输入用户名', trigger: ['input', 'blur'] }],
  password: [{ required: true, message: '请输入密码', trigger: ['input', 'blur'] }],
  email: [
    { required: true, message: '请输入邮箱', trigger: ['input', 'blur'] },
    { type: 'email', message: '邮箱格式不正确', trigger: ['input', 'blur'] },
  ],
  qq: [
    { required: true, message: '请输入 QQ 号', trigger: ['input', 'blur'] },
    { pattern: /^\d{5,11}$/, message: 'QQ 号格式不正确', trigger: ['input', 'blur'] },
  ],
  collegeId: [{ required: true, type: 'number', message: '请选择学院', trigger: ['change', 'blur'] }],
  grade: [{ required: true, type: 'string', message: '请选择年级', trigger: ['change', 'blur'] }],
  classId: [{ required: true, type: 'number', message: '请选择班级', trigger: ['change', 'blur'] }],
}

function showError(error: unknown, fallback: string) {
  message.error(error instanceof Error ? error.message : fallback)
}

async function loadColleges() {
  loadingColleges.value = true
  try {
    colleges.value = await getColleges()
  } catch (error) {
    showError(error, '学院列表加载失败')
  } finally {
    loadingColleges.value = false
  }
}

async function handleCollegeChange(value: number | null) {
  const requestSeq = ++gradesRequestSeq
  // 学院变化会同时改变年级/班级数据源：
  // 作废在途的年级/班级请求，并复位 loading，避免旧请求 finally 失效后永久转圈。
  classesRequestSeq += 1
  loadingGrades.value = false
  loadingClasses.value = false
  form.grade = null
  form.classId = null
  grades.value = []
  classes.value = []
  if (value === null) return

  loadingGrades.value = true
  try {
    const result = await getGrades(value)
    if (requestSeq !== gradesRequestSeq) return
    grades.value = result
  } catch (error) {
    if (requestSeq !== gradesRequestSeq) return
    showError(error, '年级列表加载失败')
  } finally {
    if (requestSeq === gradesRequestSeq) loadingGrades.value = false
  }
}

async function handleGradeChange(value: string | null) {
  const requestSeq = ++classesRequestSeq
  const collegeId = form.collegeId
  loadingClasses.value = false
  form.classId = null
  classes.value = []
  if (!value || collegeId === null) return

  loadingClasses.value = true
  try {
    const result = await getClasses(collegeId, value)
    if (requestSeq !== classesRequestSeq) return
    classes.value = result
  } catch (error) {
    if (requestSeq !== classesRequestSeq) return
    showError(error, '班级列表加载失败')
  } finally {
    if (requestSeq === classesRequestSeq) loadingClasses.value = false
  }
}

async function handleSubmit() {
  if (submitting.value) return

  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  if (form.collegeId === null || form.classId === null || !form.grade) return

  submitting.value = true
  try {
    await register({
      uid: form.uid.trim(),
      username: form.username.trim(),
      password: form.password,
      email: form.email.trim(),
      qq: form.qq.trim(),
      collegeId: form.collegeId,
      classId: form.classId,
      grade: form.grade,
    })
    message.success('注册申请提交成功，请等待审核')
    router.push('/login')
  } catch (error) {
    showError(error, '注册失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

onMounted(loadColleges)
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
  max-width: 460px;
}
</style>
