<template>
  <div class="user-list-page setting-page">
    
    <div class="setting-card profile-header">
      <div class="avatar-section">
        <n-avatar :size="100" :src="userStore.userInfo.avatar" round class="user-avatar" />
        <div class="avatar-mask">
          <n-upload action="#" :show-file-list="false">
            <n-icon size="24" color="#fff"><CameraIcon /></n-icon>
          </n-upload>
        </div>
      </div>
      <div class="profile-info">
        <div class="main-name">{{ userStore.userInfo.username }}</div>
        <div class="uid">UID: {{ userStore.userInfo.id }}</div>
        <n-button text type="primary" size="small" class="upload-btn">
          <n-upload action="#" :show-file-list="false">更换头像</n-upload>
        </n-button>
        <div class="tip">支持 JPG, PNG 格式，大小不超过 2MB</div>
      </div>
    </div>

    <div class="setting-card">
      <div class="card-header">
        <div class="title">基本信息</div>
        <n-button 
          v-if="!isEditing" 
          secondary type="primary" size="small" 
          @click="startEdit"
        >
          <template #icon><n-icon><CreateIcon /></n-icon></template>
          修改信息
        </n-button>
      </div>

      <div v-if="!isEditing" class="info-view">
        <div class="compact-grid">
          <div class="compact-item">
            <span class="label">姓名</span>
            <span class="value">{{ userStore.userInfo.name }}</span>
          </div>
          <div class="compact-item">
            <span class="label">学号</span>
            <span class="value">{{ userStore.userInfo.id }}</span>
          </div>
          <div class="compact-item">
            <span class="label">学院</span>
            <span class="value">{{ userStore.userInfo.college || '未填写' }}</span>
          </div>
          <div class="compact-item">
            <span class="label">班级</span>
            <span class="value">{{ userStore.userInfo.class || '未填写' }}</span>
          </div>
        </div>
      </div>

      <div v-else class="info-edit">
        <n-alert type="warning" show-icon class="edit-alert">
          修改关键信息（学号、学院、班级）提交后需要管理员审核。
        </n-alert>
        
        <n-form 
          ref="formRef" 
          :model="formValue" 
          label-placement="left" 
          label-width="70"
          size="small"
          class="compact-form"
        >
          <n-grid :x-gap="20" :y-gap="12" cols="1 s:2">
            <n-grid-item>
              <n-form-item label="姓名">
                <n-input v-model:value="formValue.name" placeholder="请输入姓名" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="学号">
                <n-input v-model:value="formValue.studentId" placeholder="请输入学号" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="学院">
                <n-select v-model:value="formValue.college" :options="collegeOptions" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="班级">
                <n-input v-model:value="formValue.class" placeholder="例：软件工程2201" />
              </n-form-item>
            </n-grid-item>
          </n-grid>
          
          <n-form-item label="修改原因" class="reason-item" style="margin-top: 8px">
            <n-select v-model:value="formValue.reason" :options="reasonOptions" placeholder="请选择修改原因" />
          </n-form-item>

          <div class="form-actions">
            <n-button @click="cancelEdit" size="small">取消</n-button>
            <n-button type="primary" @click="handleSubmitInfo" size="small">提交审核</n-button>
          </div>
        </n-form>
      </div>
    </div>

    <div class="setting-card">
      <div class="card-header">
        <div class="title">成就认证申请</div>
      </div>
      <div class="achievement-form">
        <n-form
          label-placement="left"
          label-width="100"
          size="small"
        >
          <n-form-item label="比赛名称" required>
            <n-input v-model:value="achievementForm.title" placeholder="请输入比赛名称" />
          </n-form-item>
          <n-form-item label="证明文件" required>
            <n-upload
              action="#"
              :default-upload="false"
              :max="1"
              accept=".jpg,.jpeg,.png,.pdf"
              @change="handleAchievementFileChange"
            >
              <n-button size="small">
                <template #icon><n-icon><UploadIcon /></n-icon></template>
                上传文件 (图片或PDF)
              </n-button>
            </n-upload>
          </n-form-item>
          <n-form-item label="详细信息">
            <n-input
              v-model:value="achievementForm.description"
              type="textarea"
              placeholder="请输入详细信息"
              :rows="3"
            />
          </n-form-item>
          <n-button type="primary" @click="handleSubmitAchievement" size="small">
            <template #icon><n-icon><TrophyIcon /></n-icon></template>
            提交申请
          </n-button>
        </n-form>
      </div>
    </div>

    <div class="setting-card">
      <div class="card-header"><div class="title">账号安全</div></div>
      <div class="security-list">
        <div class="security-item">
          <div class="icon-wrapper email"><n-icon size="20"><MailIcon /></n-icon></div>
          <div class="content">
            <div class="item-title">电子邮箱</div>
            <div class="item-desc">
              <span v-if="userStore.userInfo.email" class="bound-text">已绑定：{{ userStore.userInfo.email }}</span>
              <span v-else class="unbound-text">未绑定邮箱，无法找回密码</span>
            </div>
          </div>
          <div class="action">
            <n-button secondary size="small" @click="showEmailModal = true">
              {{ userStore.userInfo.email ? '更换' : '绑定' }}
            </n-button>
          </div>
        </div>
        <div class="security-item">
          <div class="icon-wrapper lock"><n-icon size="20"><LockIcon /></n-icon></div>
          <div class="content">
            <div class="item-title">登录密码</div>
            <div class="item-desc">定期修改密码可以保护账号安全</div>
          </div>
          <div class="action">
            <n-button secondary size="small">修改</n-button>
          </div>
        </div>
      </div>
    </div>

    <div class="setting-card">
      <div class="card-header"><div class="title">第三方账号绑定</div></div>
      <div class="oj-bind-list">
        <div class="oj-item" v-for="oj in ojList" :key="oj.name">
          <div class="oj-info">
            <div class="oj-name">{{ oj.name }}</div>
            <div class="oj-status">
              <span v-if="oj.account" class="bound">已绑定: {{ oj.account }}</span>
              <span v-else class="unbound">从未绑定</span>
            </div>
          </div>
          <n-button 
            size="tiny" 
            :type="oj.account ? 'error' : 'primary'"
            secondary
          >
            {{ oj.account ? '解绑' : '绑定' }}
          </n-button>
        </div>
      </div>
    </div>

    <n-modal v-model:show="showEmailModal" preset="card" title="绑定/更换邮箱" style="width: 400px">
      <n-space vertical size="large">
        <n-auto-complete
          v-model:value="emailForm.value"
          :options="emailOptions"
          placeholder="请输入新邮箱"
          size="large"
          clearable
          :input-props="{ autocomplete: 'disabled' }"
        >
          <template #prefix><n-icon><MailIcon /></n-icon></template>
        </n-auto-complete>

        <n-input-group>
          <n-input v-model:value="emailForm.code" placeholder="验证码" size="large" />
          <n-button size="large" ghost>发送验证码</n-button>
        </n-input-group>
        <n-button type="primary" block size="large" @click="handleBindEmail">确认绑定</n-button>
      </n-space>
    </n-modal>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useMessage } from 'naive-ui';
import type { UploadFileInfo } from 'naive-ui';
import { 
  CameraOutline as CameraIcon, 
  CreateOutline as CreateIcon,
  MailOutline as MailIcon,
  LockClosedOutline as LockIcon,
  TrophyOutline as TrophyIcon,
  CloudUploadOutline as UploadIcon
} from '@vicons/ionicons5';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();
const message = useMessage();
const showEmailModal = ref(false);
const isEditing = ref(false);

// 基本信息表单
const formValue = reactive({
  name: '',
  studentId: '',
  college: '',
  class: '',
  reason: null
});

// 成就申请表单
const achievementForm = reactive({
  title: '',
  description: '',
  file: null as File | null
});

// 邮箱表单
const emailForm = reactive({
  value: '',
  code: ''
});

// 邮箱自动补全逻辑
const emailOptions = computed(() => {
  const commonSuffixes = ['@gmail.com', '@163.com', '@qq.com', '@hnie.edu.cn', '@outlook.com'];
  const prefix = emailForm.value.split('@')[0];
  
  if (!prefix) return [];
  
  return commonSuffixes.map((suffix) => ({
    label: prefix + suffix,
    value: prefix + suffix
  }));
});

// 初始化表单
const startEdit = () => {
  formValue.name = userStore.userInfo.name;
  formValue.studentId = userStore.userInfo.id;
  formValue.college = userStore.userInfo.college || '';
  formValue.class = userStore.userInfo.class || '';
  formValue.reason = null;
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
};

const handleSubmitInfo = () => {
  if (!formValue.reason) {
    message.warning('请选择修改原因');
    return;
  }
  // TODO: 实现逻辑
  message.success('申请已提交，请等待管理员审核');
  isEditing.value = false;
};

const handleBindEmail = () => {
  if (!emailForm.value || !emailForm.code) {
    message.warning('请填写完整信息');
    return;
  }
  message.success('邮箱绑定成功');
  showEmailModal.value = false;
};

const handleAchievementFileChange = (options: { fileList: UploadFileInfo[] }) => {
  const file = options.fileList[0]?.file;
  if (file) {
    achievementForm.file = file;
  } else {
    achievementForm.file = null;
  }
};

const handleSubmitAchievement = () => {
  if (!achievementForm.title) {
    message.warning('请输入比赛名称');
    return;
  }
  if (!achievementForm.file) {
    message.warning('请上传证明文件');
    return;
  }
  
  // TODO: 调用 API 提交成就申请
  console.log('提交成就申请:', achievementForm);
  
  message.success('成就认证申请已提交，请等待审核');
  
  // 重置表单
  achievementForm.title = '';
  achievementForm.description = '';
  achievementForm.file = null;
};

//TODO: 从后端获取数据
const collegeOptions = [
  { label: '计算机与人工智能学院', value: 'cs_ai' },
  { label: '电气工程学院', value: 'ee' },
  { label: '机械工程学院', value: 'me' }
];

const reasonOptions = [
  { label: '信息填写错误', value: 'error' },
  { label: '转专业/班级变动', value: 'change' },
  { label: '其他', value: 'other' }
];

const ojList = ref([
  { name: 'Codeforces', account: '' },
  { name: 'AtCoder', account: '' },
  { name: 'SPOJ', account: '' },
  { name: 'UVa', account: '_37_' },
]);
</script>

<style scoped lang="less">
.setting-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-card {
  background: #fff;
  border-radius: 4px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  margin-bottom: 24px;
}


// 顶部个人资料
.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;

  .avatar-section {
    position: relative;
    cursor: pointer;
    
    .avatar-mask {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }
    &:hover .avatar-mask { opacity: 1; }
  }

  .profile-info {
    .main-name { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 4px; }
    .uid { font-family: monospace; color: #666; font-size: 14px; margin-bottom: 8px; }
    .upload-btn { margin-bottom: 4px; font-size: 13px; }
    .tip { font-size: 12px; color: #999; }
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid #f5f5f5;
  padding-bottom: 10px;
  
  .title { font-size: 16px; font-weight: bold; color: #333; border-left: 4px solid #2080f0; padding-left: 12px; line-height: 1; }
}

.compact-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px; 
  padding: 0 8px;

  .compact-item {
    display: flex;
    flex-direction: column;
    
    .label { font-size: 12px; color: #999; margin-bottom: 2px; }
    .value { font-size: 14px; color: #333; font-weight: 500; }
  }
}

// 编辑表单
.info-edit {
  .edit-alert { margin-bottom: 16px; }
  .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; }
  .reason-item { max-width: 50%; }
}

.security-list {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .security-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    background: #f9f9f9;
    border-radius: 6px;

    .icon-wrapper {
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      &.email { background: #e6f7ff; color: #1890ff; }
      &.lock { background: #fff7e6; color: #fa8c16; }
    }

    .content {
      flex: 1;
      .item-title { font-size: 14px; font-weight: 600; color: #333; }
      .item-desc { 
        font-size: 12px; color: #666; margin-top: 2px; 
        .bound-text { color: #18a058; }
        .unbound-text { color: #d03050; }
      }
    }
  }
}

.oj-bind-list {
  max-width: 600px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  .oj-item {
    border: 1px solid #eee;
    padding: 12px 16px;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .oj-name { font-weight: bold; font-size: 15px; margin-bottom: 4px; }
    .oj-status { font-size: 12px; color: #999; }
    .bound { color: #18a058; }
  }
}
</style>
