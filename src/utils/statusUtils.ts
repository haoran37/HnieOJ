import { h } from 'vue';
import { NIcon } from 'naive-ui';
import { 
  CheckmarkCircle as CheckIcon, 
  CloseCircle as CloseIcon, 
  Remove as TodoIcon 
} from '@vicons/ionicons5';

// 状态对应的配置
export const getStatusConfig = (status: string) => {
  switch (status) {
    case 'AC':
      return { color: '#18a058', icon: CheckIcon, label: '已通过' };
    case 'WA':
      return { color: '#d03050', icon: CloseIcon, label: '未通过' };
    default:
      return { color: '#ccc', icon: TodoIcon, label: '未开始' };
  }
};

// 渲染图标的辅助函数
export const renderStatusIcon = (status: string, size = 18) => {
  const config = getStatusConfig(status);
  return h(NIcon, { size, color: config.color }, { default: () => h(config.icon) });
};