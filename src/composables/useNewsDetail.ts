import { ref } from 'vue';

export interface NewsDetail {
  id: string;
  title: string;
  author: string;
  createTime: string;
  content: string;
  viewCount: number;
}

export function useNewsDetail() {
  const loading = ref(false);
  const detail = ref<NewsDetail>({
    id: '',
    title: '',
    author: '',
    createTime: '',
    content: '',
    viewCount: 0
  });

  //TODO: 替换真实api
  const fetchNewsDetail = async (id: string) => {
    loading.value = true;
    setTimeout(() => {
      detail.value = {
        id: id,
        title: '【重要通知】HNIE Online Judge 系统维护公告',
        author: 'Admin',
        createTime: '2025-02-15 14:30',
        viewCount: 1205,
        content: `
# 系统维护通知

尊敬的各位用户：

为了提供更加稳定、优质的服务，HNIE OJ 将于 **2025年2月20日 00:00 - 04:00** 进行服务器升级维护。

## 维护内容
1.  评测机核心组件升级至 v2.0
2.  数据库性能优化
3.  修复若干已知 Bug

带来不便，敬请谅解！

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
  cout << "Hello HnieOJ!" << endl;
  return 0;
}

\`\`\`


$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\pi^2}{6} = \\prod_{p \\text{ prime}} \\frac{1}{1 - p^{-2}} = \\frac{\\Gamma\\left(\\frac{1}{2}\\right)^2}{\\sqrt{2}}
$$

![哈气](https://s11.ax1x.com/2023/04/27/p9QuT2R.jpg){{{width="300" height="auto"}}}

        `
      };
      loading.value = false;
    }, 400);
  };

  const deleteNews = async (id: string) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('Deleted news:', id);
        resolve();
      }, 500);
    });
  };

  //TODO: 更新新闻 (PUT)
  const updateNews = async (id: string, data: Partial<NewsDetail>) => {
    loading.value = true;
    return new Promise<void>((resolve) => {
      console.log(`PUT /api/news/${id}`, data);
      setTimeout(() => {
        // 更新本地数据
        if (detail.value) {
          detail.value = { ...detail.value, ...data };
        }
        loading.value = false;
        resolve();
      }, 600);
    });
  };

  return {
    loading,
    detail,
    fetchNewsDetail,
    deleteNews,
    updateNews
  };
}