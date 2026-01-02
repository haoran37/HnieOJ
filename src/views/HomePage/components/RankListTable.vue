<template>
  <BoardCard title="">
    <template #icon>
      <n-dropdown :options="monthOptions" @select="handleMonthSelect">
        <div class="rank-title-trigger">
          <n-icon size="20"><RankIcon /></n-icon>
          <span class="title-text">{{ selectedMonth }}月排名</span>
          <n-icon size="16" class="arrow"><ChevronDown /></n-icon>
        </div>
      </n-dropdown>
    </template>

    <template #extra>
      <n-button text size="tiny" type="primary" color="#007bff">View all »</n-button>
    </template>

    <n-data-table
      remote
      :columns="columns"
      :data="tableData"
      :loading="loading"
      :pagination="pagination"
      :bordered="false"
      size="small"
      class="rank-table"
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />
  </BoardCard>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, h, computed } from 'vue'
import BoardCard from '@/components/BoardCard.vue'
import { BarChartOutline as RankIcon, ChevronDown } from '@vicons/ionicons5'
import { NButton } from 'naive-ui'

const now = new Date()
const currentMonthNum = now.getMonth() + 1
const selectedMonth = ref(currentMonthNum.toString())

const monthOptions = computed(() => {
  const options = []
  for (let m = currentMonthNum; m >= 1; m--) {
    options.push({ label: `${m}月排名`, key: m.toString() })
  }
  return options
})

// 状态与分页响应式对象
const loading = ref(false)
const tableData = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 50, 100, 200],
  prefix: (info: any) => `共 ${info.itemCount} 条数据`
})

// 异步请求
const fetchData = async () => {
  loading.value = true
  
  // 准备发送给后端的参数
  const params = {
    month: selectedMonth.value,
    page: pagination.page,
    limit: pagination.pageSize // 每页个数
  }

  try {
    console.log('--- 发起请求 ---')
    console.log('目标月份:', params.month)
    console.log('当前页码:', params.page)
    console.log('每页个数:', params.limit)

    // TODO: 替换为实际 API
    // const { data: res } = await api.getRankList(params)
    
    // 模拟后端返回过程
    setTimeout(() => {
      tableData.value = Array.from({ length: pagination.pageSize }).map((_, i) => ({
        rank: (pagination.page - 1) * pagination.pageSize + i + 1,
        studentId: `2024${params.month}${String(i).padStart(3, '0')}`,
        className: '计算2401',
        name: '测试用户',
        solved: Math.floor(Math.random() * 100),
        submit: 200
      }))
      
      pagination.itemCount = 220
      loading.value = false
    }, 400)
  } catch (error) {
    console.error('获取排名失败:', error)
    loading.value = false
  }
}

const columns = [
  { title: '名次', key: 'rank', width: 70, align: 'center' },
    { 
      title: '学号', 
      key: 'studentId', 
      align: 'center',
      render(row: any) {
        return h(
          NButton,
          {
            text: true,
            color: '#007bff', 
            style: {
              fontWeight: '500',
              fontSize: '14px',
              textDecoration: 'none'
            },
            onClick: () => {
              // TODO: 实现跳转到用户主页
              console.log('准备跳转到用户主页:', row.studentId)
            }
          },
          { default: () => row.studentId }
        )
      }
    },
  { title: '专业班级', key: 'className', align: 'center' },
  { title: '姓名', key: 'name', align: 'center' },
  { title: '解决数', key: 'solved', align: 'center' },
  { title: '提交数', key: 'submit', align: 'center' },
]

const handleMonthSelect = (key: string) => {
  selectedMonth.value = key
  pagination.page = 1
  fetchData()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  fetchData()
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped lang="less">
.rank-title-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  &:hover { background-color: rgba(0, 0, 0, 0.05); }

  .title-text {
    font-size: 18px;
    font-weight: 800;
    color: #333;
  }
}

:deep(.rank-table) {
  .n-data-table-th {
    background-color: #f9f9f9 !important;
    font-weight: bold;
  }
  .n-data-table__pagination {
    justify-content: center;
    margin-top: 20px;
  }
}
</style>