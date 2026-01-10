import { h } from 'vue';
import { NTag } from 'naive-ui';
import type { Router } from 'vue-router';
import type { Submission } from '@/composables/useStatusList';

// 状态枚举与颜色配置
const statusConfig: Record<string, { color: string; label: string }> = {
  'Accepted': { color: '#d03050', label: 'Accepted' },
  
  'Wrong Answer': { color: '#18a058', label: 'Wrong Answer' },
  'Time Limit Exceeded': { color: '#18a058', label: 'Time Limit Exceeded' },
  'Memory Limit Exceeded': { color: '#18a058', label: 'Memory Limit Exceeded' },
  'Output Limit Exceeded': { color: '#18a058', label: 'Output Limit Exceeded' },
  'File Error': { color: '#18a058', label: 'File Error' },
  'Nonzero Exit Status': { color: '#18a058', label: 'Nonzero Exit Status' },
  'Signalled': { color: '#18a058', label: 'Signalled' },
  
  'Compilation Error': { color: '#2080f0', label: 'Compilation Error' },
  'Runtime Error': { color: '#2080f0', label: 'Runtime Error' },
  'Internal Error': { color: '#2080f0', label: 'Internal Error' },
  
  'Pending': { color: '#909399', label: 'Pending' },
  'Compiling': { color: '#909399', label: 'Compiling' },
  'Judging': { color: '#909399', label: 'Judging' },
  'Cancelled': { color: '#909399', label: 'Cancelled' }
};

export const createStatusColumns = (router: Router) => [
  {
    title: 'Run ID',
    key: 'id',
    width: 80,
    align: 'center' as const
  },
  {
    title: 'SID',
    key: 'studentId',
    width: 120,
    render: (row: Submission) => h('span', { style: { color: '#2080f0', cursor: 'pointer' } }, row.studentId)
  },
  {
    title: 'Name',
    key: 'username',
    width: 120,
    render: (row: Submission) => h(
      'a', 
      { style: { color: '#333', textDecoration: 'none', fontWeight: 500 } }, 
      row.username
    )
  },
  {
    title: 'PID',
    key: 'problemId',
    width: 80,
    align: 'center' as const,
    // render: (row: Submission) => h(
    //   'a',
    //   { 
    //     style: { color: '#2080f0', cursor: 'pointer', textDecoration: 'none' },
    //     onClick: (e: MouseEvent) => {
    //       e.preventDefault();
    //       router.push(`/problem/${row.problemId}`);
    //     }
    //   },
    //   row.problemId
    // )
  },
  {
    title: 'Title',
    key: 'problemTitle',
    render: (row: Submission) => h(
      'a',
      { 
        style: { color: '#2080f0', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' },
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          router.push(`/problem/${row.problemId}`);
        }
      },
      row.problemTitle
    )
  },
  {
    title: 'Status',
    key: 'status',
    width: 180,
    align: 'center' as const,
    render(row: Submission) {
      const config = statusConfig[row.status] || { color: '#999', label: row.status };
      
      return h(
        'a',
        { 
          href: `/status/${row.id}`,
          style: { 
            textDecoration: 'none',
            color: config.color, 
            fontWeight: 'bold',
            cursor: 'pointer' 
          },
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            router.push(`/status/${row.id}`);
          }
        },
        config.label
      );
    }
  },
  {
    title: 'Lang',
    key: 'language',
    width: 80,
    align: 'center' as const
  },
  {
    title: 'Time',
    key: 'time',
    width: 90,
    align: 'right' as const
  },
  {
    title: 'Memory',
    key: 'memory',
    width: 90,
    align: 'right' as const
  },
  {
    title: 'SubmitTime',
    key: 'submitTime',
    width: 170,
    align: 'right' as const
  }
];