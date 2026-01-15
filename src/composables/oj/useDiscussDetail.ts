import { ref, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { useUserStore } from '@/stores/userStore';

export const DEFAULT_AVATAR = 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg';

// 二级评论接口
export interface Comment {
  id: number;
  user: { id: string; username: string; avatar?: string };
  content: string;
  time: string;
  likes: number;
}

// 一级回答接口
export interface Answer {
  id: number;
  user: { id: string; username: string; avatar?: string };
  content: string; // Markdown
  time: string;
  voteCount: number; // 赞踩差值
  upvoted: boolean;
  downvoted: boolean;
  comments: Comment[];
}

// 主题帖接口
export interface DiscussionPost {
  id: string;
  title: string;
  content: string; // Markdown
  user: { id: string; username: string; avatar?: string };
  time: string;
  viewCount: number;
  voteCount: number;
  upvoted: boolean;
  downvoted: boolean;
  category: string;
  tags: string[];
}

export function useDiscussDetail() {
  const message = useMessage();
  const userStore = useUserStore();
  const loading = ref(false);
  
  const post = ref<DiscussionPost | null>(null);
  const answers = ref<Answer[]>([]);

  //TODO: 替换真实api
  const fetchDetail = async (id: string) => {
    loading.value = true;
    setTimeout(() => {
      post.value = {
        id,
        title: '关于题目 P1001 A+B Problem 的时间复杂度疑问',
        content: `我在做这道题的时候，发现如果使用 \`cin\` 和 \`cout\` 会导致 TLE，但是改成 \`scanf\` 和 \`printf\` 就过了。

\`\`\`cpp
#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b; 
    cout << a + b << endl;
    return 0;
}
\`\`\`

请问这是为什么？有没有大佬能解释一下底层原理？`,
        user: { 
          id: 'u_author_001', 
          username: 'Newbie_Coder', 
          avatar: 'https://api.dicebear.com/7.x/miniavs/svg?seed=1' 
        },
        time: '2025-02-14 10:30',
        viewCount: 1205,
        voteCount: 12,
        upvoted: true,
        downvoted: false,
        category: '题目讨论',
        tags: ['C++', 'IO优化', 'P1001']
      };

      // 回答列表
      answers.value = [
        {
          id: 101,
          user: { id: 'u2', username: 'AK_King', avatar: 'https://api.dicebear.com/7.x/miniavs/svg?seed=2' },
          content: `这是因为 C++ 的 \`cin/cout\` 为了兼容 C 语言的 \`scanf/printf\`，默认开启了同步流。这会导致每次 I/O 操作都检查同步，从而拖慢速度。
          
你可以通过添加以下代码来关闭同步：

\`\`\`cpp
ios::sync_with_stdio(false);
cin.tie(nullptr);
\`\`\`

这样之后 \`cin\` 的速度就和 \`scanf\` 差不多了。`,
          time: '2025-02-14 11:00',
          voteCount: 45,
          upvoted: false,
          downvoted: false,
          comments: [
            { 
              id: 201, 
              user: { id: 'u_author_001', username: 'Newbie_Coder', avatar: '' }, 
              content: '原来如此！测试了一下确实快了很多，感谢大佬！', 
              time: '2025-02-14 11:05', 
              likes: 2 
            }
          ]
        },
        {
          id: 102,
          user: { id: 'u4', username: 'Python_Fan', avatar: 'https://api.dicebear.com/7.x/miniavs/svg?seed=3' },
          content: '建议直接用 Python，人生苦短，我用 Python。',
          time: '2025-02-14 12:00',
          voteCount: -5,
          upvoted: false,
          downvoted: true,
          comments: []
        }
      ];
      
      loading.value = false;
    }, 400);
  };

  // 排序：票数差值从大到小
  const sortedAnswers = computed(() => {
    return [...answers.value].sort((a, b) => b.voteCount - a.voteCount);
  });

  // 投票逻辑 (前端模拟)
  const handleVote = (targetType: 'post' | 'answer', id: string | number, direction: 'up' | 'down') => {
    //TODO: 首先逻辑
    message.info(`[事件] 对 ${targetType === 'post' ? '帖子' : '回答'} ${id} 进行了 ${direction === 'up' ? '点赞' : '点踩'}`);

    const target = targetType === 'post' ? post.value : answers.value.find(a => a.id === id);
    if (!target) return;

    if (direction === 'up') {
      if (target.upvoted) { 
        target.upvoted = false; 
        target.voteCount--; 
      } else { 
        target.upvoted = true; 
        target.voteCount++; 
        if (target.downvoted) { 
          target.downvoted = false; 
          target.voteCount++; 
        } 
      }
    } else {
      if (target.downvoted) { 
        target.downvoted = false; 
        target.voteCount++; 
      } else { 
        target.downvoted = true; 
        target.voteCount--; 
        if (target.upvoted) { 
          target.upvoted = false; 
          target.voteCount--; 
        } 
      }
    }
  };

  // 提交二级评论
  const submitComment = (answerId: number, content: string) => {
    //TODO: 首先逻辑
    message.info(`[事件] 提交评论给回答 ${answerId}: ${content}`);
    const ans = answers.value.find(a => a.id === answerId);
    if (ans) {
      ans.comments.push({
        id: Date.now(),
        user: { 
          id: userStore.userInfo.id, 
          username: userStore.userInfo.username, 
          avatar: userStore.userInfo.avatar 
        },
        content: content,
        time: '刚刚',
        likes: 0
      });
      message.success('评论发表成功');
    }
  };

  // 提交新回答
  const submitAnswer = (content: string) => {
    //TODO: 首先逻辑
    message.info(`[事件] 发布新回答: ${content.substring(0, 10)}...`);
    answers.value.push({
      id: Date.now(),
      user: { 
        id: userStore.userInfo.id, 
        username: userStore.userInfo.username, 
        avatar: userStore.userInfo.avatar 
      },
      content: content,
      time: '刚刚',
      voteCount: 0,
      upvoted: false,
      downvoted: false,
      comments: []
    });
    message.success('回答提交成功');
  };

  return { loading, post, sortedAnswers, fetchDetail, handleVote, submitComment, submitAnswer };
}