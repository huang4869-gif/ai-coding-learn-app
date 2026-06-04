/* =========================================================
   闯关游戏 · 内容数据
   - chapters：章节和每章的关卡
   - levels：每一关的内容（关卡标题 + 小五开场 + 一串小互动）
   题型：choice 选择题 / judge 判断题 / match 连连看
   ========================================================= */
const GAME = {
  mascot: '小五',
  chapters: [
    { id: 'c1', title: '第一章 · 先搞懂 AI 编程', levels: ['lv1', 'lv2', 'lv3', 'lv4'] },
  ],
  levels: {
    lv1: {
      id: 'lv1', index: 1, icon: '🌱', title: '什么是 AI 编程？', ready: true,
      intro: '这一关我们搞懂：AI 编程到底是个啥。别紧张，跟着玩就行～',
      exercises: [
        {
          type: 'choice', mascot: '先来个简单的——',
          q: 'AI 编程，主要是指下面哪件事？',
          options: ['自己一行行手写全部代码', '用大白话指挥 AI 帮你写程序', '修电脑、装系统'],
          answer: 1,
          explain: 'AI 编程就是你说人话、AI 来写代码，你不用自己写。',
        },
        {
          type: 'judge', mascot: '判断一下——',
          q: '想用 AI 编程，必须先学会写代码。',
          answer: false,
          explain: '不用哦～可以边用边学，先学会把需求说清楚就够了。',
        },
        {
          type: 'choice', mascot: '看个真实场景——',
          q: '你想让 AI 帮你做个网页，下面哪种说法它更懂你？',
          options: ['“帮我写个网页。”', '“做个简单的个人主页，放我名字和三句介绍，用暖色调。”', '“随便弄弄就行。”'],
          answer: 1,
          explain: '说得越具体，AI 越懂你、做得越准。',
        },
        {
          type: 'match', mascot: '连连看——',
          q: 'AI 编程就像下馆子，把角色连起来：',
          pairs: [['你', '点菜的人'], ['AI', '后厨厨师'], ['把需求说清楚', '你最该练的本事']],
          explain: '你负责点菜（说需求），AI 负责下厨（写代码），合作就成了。',
        },
        {
          type: 'choice', mascot: '最后一题——',
          q: '在 AI 编程里，你最重要的工作是什么？',
          options: ['背下所有编程语法', '把需求说清楚、判断结果对不对', '自己修复每一个错误'],
          answer: 1,
          explain: '说清楚 + 会判断，这才是你的核心本事。',
        },
      ],
      outro: '太棒了，你已经迈出第一步！',
    },
    // 以下三关先占位，跑通第 1 关后再补内容
    lv2: { id: 'lv2', index: 2, icon: '💬', title: '怎么向 AI 提问？', ready: false, exercises: [] },
    lv3: { id: 'lv3', index: 3, icon: '🎯', title: '什么是 Prompt？', ready: false, exercises: [] },
    lv4: { id: 'lv4', index: 4, icon: '🧭', title: 'AI 能做/不能做什么', ready: false, exercises: [] },
  },
};
if (typeof window !== 'undefined') window.GAME = GAME;
