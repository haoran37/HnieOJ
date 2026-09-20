import { h } from 'vue';
import type { Router } from 'vue-router';
import type { Submission } from '@/composables/oj/useStatusList';

// 状态枚举与颜色配置（键为后端 SubmissionStatusConstant.toText 的文案）
export const statusConfig: Record<string, { color: string; label: string }> = {
  'Accepted': { color: '#18a058', label: 'Accepted' },

  'Wrong Answer': { color: '#d03050', label: 'Wrong Answer' },
  'Time Limit Exceeded': { color: '#d03050', label: 'Time Limit Exceeded' },
  'Memory Limit Exceeded': { color: '#d03050', label: 'Memory Limit Exceeded' },
  'Runtime Error': { color: '#d03050', label: 'Runtime Error' },

  'Compile Error': { color: '#f0a020', label: 'Compile Error' },
  'System Error': { color: '#f0a020', label: 'System Error' },
  'Judgement Failed': { color: '#f0a020', label: 'Judgement Failed' },
  'Invalid Interaction': { color: '#f0a020', label: 'Invalid Interaction' },

  'Pending': { color: '#909399', label: 'Pending' },
  'Compiling': { color: '#909399', label: 'Compiling' },
  'Running': { color: '#909399', label: 'Running' },

  'Unknown': { color: '#999', label: 'Unknown' }
};

export const createStatusColumns = (router: Router) => [
  {
    title: 'Run ID',
    key: 'id',
    width: 80,
    align: 'center' as const,
    render: (row: Submission) => h(
      'a',
      {
        style: { color: '#2080f0', cursor: 'pointer', fontWeight: 'bold' },
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          router.push(`/status/${row.id}`);
        }
      },
      row.id
    )
  },
  {
    title: 'UID',
    key: 'userId',
    width: 140,
    render: (row: Submission) => h(
      'a',
      {
        style: { color: '#2080f0', cursor: 'pointer' },
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          router.push(`/user/${row.studentId}`);
        }
      },
      row.studentId
    )
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
