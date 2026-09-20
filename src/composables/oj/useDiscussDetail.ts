import { ref, computed } from 'vue';
import { useMessage } from 'naive-ui';
import {
  createDiscussionAnswer,
  createDiscussionComment,
  getDiscussionDetail,
  voteDiscussion,
} from '@/utils/api';
import type { DiscussionDetailVo } from '@/utils/api';
import { formatFullTime } from '@/composables/useTime';

// 二级评论
export interface Comment {
  id: number;
  user: { id: string; username: string; avatar?: string };
  content: string;
  time: string;
}

// 一级回答
export interface Answer {
  id: number;
  user: { id: string; username: string; avatar?: string };
  content: string; // Markdown
  time: string;
  voteCount: number;
  upvoted: boolean;
  downvoted: boolean;
  comments: Comment[];
}

// 主题帖
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
  category: 'Site' | 'Problem';
  problemCode: string | null;
  tags: string[];
}

export const CATEGORY_LABEL: Record<'Site' | 'Problem', string> = {
  Site: '站内事务',
  Problem: '题目讨论',
};

export function useDiscussDetail() {
  const message = useMessage();
  const loading = ref(false);
  const error = ref<string | null>(null);

  const post = ref<DiscussionPost | null>(null);
  const answers = ref<Answer[]>([]);

  // 提交互斥：防止重复点击创建重复回答/评论
  const submittingAnswer = ref(false);
  const submittingComment = ref(false);

  let seq = 0;

  const applyDetail = (vo: DiscussionDetailVo) => {
    const p = vo.post;
    post.value = {
      id: String(p.id),
      title: p.title,
      content: p.content ?? '',
      user: { id: p.uid ?? '', username: p.author ?? '' },
      time: formatFullTime(p.gmtCreate),
      viewCount: p.viewNum ?? 0,
      voteCount: p.likeNum ?? 0,
      // 详情接口未返回当前用户投票状态
      upvoted: false,
      downvoted: false,
      category: p.category === 'Site' ? 'Site' : 'Problem',
      problemCode: p.problemCode,
      tags: p.problemCode
        ? [p.problemCode, CATEGORY_LABEL[p.category === 'Site' ? 'Site' : 'Problem']]
        : [CATEGORY_LABEL[p.category === 'Site' ? 'Site' : 'Problem']],
    };
    answers.value = (vo.answers ?? []).map((a) => ({
      id: a.id,
      user: { id: a.uid ?? '', username: a.author ?? '' },
      content: a.content ?? '',
      time: formatFullTime(a.gmtCreate),
      voteCount: a.likeNum ?? 0,
      upvoted: false,
      downvoted: false,
      comments: (a.comments ?? []).map((c) => ({
        id: c.id,
        user: { id: c.uid ?? '', username: c.author ?? '' },
        content: c.content ?? '',
        time: formatFullTime(c.gmtCreate),
      })),
    }));
  };

  // keepOnError：用于写入成功后的刷新失败场景——保留最后一次已知详情，
  // 只暴露可重试错误，避免把已提交成功的内容清空成“加载失败”。
  const fetchDetail = async (id: string, options: { keepOnError?: boolean } = {}): Promise<boolean> => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const vo = await getDiscussionDetail(id);
      if (current !== seq) return false;
      applyDetail(vo);
      return true;
    } catch (err) {
      if (current !== seq) return false;
      if (!options.keepOnError) {
        post.value = null;
        answers.value = [];
      }
      error.value = err instanceof Error ? err.message : '讨论详情加载失败';
      return false;
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  // 排序：票数差值从大到小
  const sortedAnswers = computed(() => {
    return [...answers.value].sort((a, b) => b.voteCount - a.voteCount);
  });

  // 重新拉取当前详情：失败时保留旧内容，仅显示可重试错误
  const reload = async (): Promise<boolean> => {
    if (!post.value) return false;
    return fetchDetail(post.value.id, { keepOnError: true });
  };

  // 真实投票：成功后重新拉取详情
  const handleVote = async (targetType: 'post' | 'answer', id: string | number, direction: 'up' | 'down') => {
    try {
      await voteDiscussion(targetType, id, direction);
      await reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '投票失败');
    }
  };

  // 真实提交评论：返回是否写入成功；成功后重新拉取详情。
  // submittingComment 必须覆盖“写入 + 刷新”全过程，避免刷新期间再次点击造成重复评论。
  const submitComment = async (answerId: number, content: string): Promise<boolean> => {
    if (submittingComment.value) return false;
    submittingComment.value = true;
    try {
      try {
        await createDiscussionComment(answerId, content);
      } catch (err) {
        message.error(err instanceof Error ? err.message : '评论发表失败');
        return false;
      }
      message.success('评论发表成功');
      // 写入已成功：刷新失败只提示重试，不能让用户以为写入失败而重发
      await reload();
      return true;
    } finally {
      submittingComment.value = false;
    }
  };

  // 真实提交回答：返回是否写入成功；成功后重新拉取详情。
  // submittingAnswer 覆盖“写入 + 刷新”全过程，刷新未结束前不允许再次提交。
  const submitAnswer = async (content: string): Promise<boolean> => {
    if (!post.value) return false;
    if (submittingAnswer.value) return false;
    submittingAnswer.value = true;
    try {
      try {
        await createDiscussionAnswer(post.value.id, content);
      } catch (err) {
        message.error(err instanceof Error ? err.message : '回答提交失败');
        return false;
      }
      message.success('回答提交成功');
      // 写入已成功：刷新失败只提示重试，不能让用户以为写入失败而重发
      await reload();
      return true;
    } finally {
      submittingAnswer.value = false;
    }
  };

  return {
    loading,
    error,
    post,
    sortedAnswers,
    submittingAnswer,
    submittingComment,
    fetchDetail,
    reload,
    handleVote,
    submitComment,
    submitAnswer,
  };
}
