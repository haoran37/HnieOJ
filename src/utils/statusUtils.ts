import { h } from 'vue';
import { NIcon } from 'naive-ui';
import { 
  CheckmarkCircle as CheckIcon, 
  CloseCircle as CloseIcon, 
  Remove as TodoIcon 
} from '@vicons/ionicons5';

// 状态对应的配置
// 未知状态（未查询到用户做题记录）不得显示为“未开始”，保持灰色但文案准确
export const getStatusConfig = (status: string) => {
  switch (status) {
    case 'AC':
      return { color: '#18a058', icon: CheckIcon, label: '已通过' };
    case 'WA':
      return { color: '#d03050', icon: CloseIcon, label: '未通过' };
    case 'UNKNOWN':
    default:
      return { color: '#ccc', icon: TodoIcon, label: '状态未知' };
  }
};

// 渲染图标的辅助函数；把状态文案作为原生 title/aria-label，保证可访问文案准确
export const renderStatusIcon = (status: string, size = 18) => {
  const config = getStatusConfig(status);
  return h(
    NIcon,
    { size, color: config.color, title: config.label, 'aria-label': config.label },
    { default: () => h(config.icon) },
  );
};