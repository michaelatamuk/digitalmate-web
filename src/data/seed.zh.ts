import type { FeedCard, MemoryProfile, Skill } from '../types';

export const discoverySources = [
  { id: 'all', label: '全部' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'bilibili', label: 'Bilibili' },
  { id: 'x', label: 'X' },
  { id: 'hackernews', label: 'Hacker News' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'zhihu', label: '知乎' },
  { id: 'applepodcasts', label: '播客' },
  { id: 'github', label: 'GitHub' },
  { id: 'steam', label: 'Steam' },
  { id: 'news', label: '新闻' },
  { id: 'rss', label: 'RSS' }
];

export const topicOptions = ['AI 科技', '机器人', '开源项目', '鸿蒙开发', '产品设计', '城市生活'];

export const seedCards: FeedCard[] = [
  {
    id: 'fc-1',
    source: 'youtube',
    sourceLabel: 'YouTube',
    topic: 'AI 科技',
    title: '真正会用工具的 Agent 是怎么做的',
    summary:
      '一次关于工具选择、审批边界和结构化 UI 的实战讲解，最后十分钟专门讨论失败路径。',
    glyph: '▶',
    cover: 'linear-gradient(135deg, #f3c7b8 0%, #e9a18d 42%, #c96f63 100%)',
    readingTime: '28:14',
    published: '2 小时前',
    url: 'https://www.youtube.com/',
    body: [
      '分享从一个简单的问题开始：为什么大多数 Agent Demo 到文本就结束了？讲者认为，工具结果不是交互的终点，而是一个需要用户阅读、比较和行动的新界面。',
      '视频比较了三种做法：直接吐 JSON、生成自由 HTML，以及使用受约束的组件目录。组件目录在一致性和安全性上胜出，但前提是目录足够小，模型能够稳定选择。',
      '最后一部分讨论审批边界。写入、发送、支付和删除都需要可见且一次性的确认；读取类操作可以流式返回，不必打断用户。'
    ],
    tags: ['Agent', '工具调用', 'A2UI'],
    metric: '1.24 万次观看'
  },
  {
    id: 'fc-2',
    source: 'bilibili',
    sourceLabel: 'Bilibili',
    topic: '鸿蒙开发',
    title: '鸿蒙 ArkTS 状态管理实战：从 @State 到跨页面共享',
    summary:
      '用三个真实页面拆解 ArkUI 的状态更新边界，重点讨论大对象、列表刷新和 Worker 消息的常见坑。',
    glyph: '◐',
    cover: 'linear-gradient(135deg, #f7d3e3 0%, #efaecb 50%, #d77ca7 100%)',
    readingTime: '18:32',
    published: '昨天',
    url: 'https://www.bilibili.com/',
    body: [
      '视频从一个消息列表页面开始，逐步把状态拆成页面状态、会话状态和持久化状态。作者强调：不要把所有东西塞进一个 @State，否则任何一次更新都会触发整棵树重新渲染。',
      '第二个案例讨论 Worker。主线程只保留展示所需的最小快照，重计算和文件写入都放到 Worker；消息协议要有版本号，否则升级后旧消息会静默失败。',
      '最后给出一个检查清单：可序列化、可回放、可取消、可隔离。'
    ],
    tags: ['鸿蒙', 'ArkTS', '状态管理'],
    metric: '3.8 万播放'
  },
  {
    id: 'fc-3',
    source: 'x',
    sourceLabel: 'X',
    topic: 'AI 科技',
    title: 'A2UI：面向 Agent 的声明式 UI',
    summary:
      '一条讨论：Agent 的输出应该是组件树加数据模型，而不是截图或一堵 Markdown 墙。',
    glyph: '𝕏',
    cover: 'linear-gradient(135deg, #d9d4cc 0%, #a9a39b 45%, #5f5a54 100%)',
    readingTime: '6 分钟阅读',
    published: '3 小时前',
    url: 'https://x.com/',
    body: [
      '这条讨论明确区分了内容和控件。Markdown 适合表达内容，但不适合承载控件。一旦 Agent 需要用户选车次、确认支付或修改草稿，纯文本就不够用了。',
      'A2UI 让模型保持声明式：创建 surface、描述组件树、绑定数据模型。渲染、无障碍和平台行为由客户端负责。',
      '讨论里最有力量的一条回复是：“难点不在协议，而在于决定哪些组件你拒绝加入。”'
    ],
    tags: ['A2UI', 'Agent', '协议'],
    metric: '2100 喜欢'
  },
  {
    id: 'fc-4',
    source: 'hackernews',
    sourceLabel: 'Hacker News',
    topic: '开源项目',
    title: 'Show HN：面向个人 Agent 的本地优先记忆层',
    summary:
      '一个把 embedding 和检索留在本地的开源项目，可选接入云端 embedding 服务。312 分，评论区讨论热烈。',
    glyph: 'Y',
    cover: 'linear-gradient(135deg, #ffd9b0 0%, #ffb26b 48%, #e07a2f 100%)',
    readingTime: '8 分钟阅读',
    published: '5 小时前',
    url: 'https://news.ycombinator.com/',
    body: [
      '作者认为个人记忆太敏感，不应该默认上传到远端向量数据库。项目把事实和向量都存在本地，只有用户显式开启云端 embedding 时才发送文本。',
      '评论区主要质疑两点：schema 迁移和多设备同步。作者承认这两点都还没解决，当前设计优先服务单台手机。',
      '讨论里一个有用的模式是：把记忆写入路径和召回路径分开，并让召回在失败时降级为空结果，而不是编造一个结果。'
    ],
    tags: ['记忆', '本地优先', '开源'],
    metric: '312 分 · 96 条评论'
  },
  {
    id: 'fc-5',
    source: 'reddit',
    sourceLabel: 'Reddit',
    topic: 'AI 科技',
    title: '2026 年，端侧 Agent 到底哪些方案可用？',
    summary:
      'r/LocalLLaMA 讨论模型大小、量化和那些不性感的部分：权限、耗电和后台限制。',
    glyph: '◉',
    cover: 'linear-gradient(135deg, #ffd2c2 0%, #ff9f80 50%, #e05a3c 100%)',
    readingTime: '11 分钟阅读',
    published: '昨天',
    url: 'https://www.reddit.com/r/LocalLLaMA/',
    body: [
      '最高赞评论很直接：模型很少是瓶颈。权限、后台执行和工具可靠性才是决定体验的部分。',
      '几个人分享了耗电测试。3B 模型持续运行依然昂贵；把任务拆成短小、可取消的窗口，比常驻 Agent 循环更现实。',
      '帖子最后给出一条规则：如果一个任务可以用确定性模板完成，就不要调用模型。'
    ],
    tags: ['端侧', '大模型', '耗电'],
    metric: '1400 赞'
  },
  {
    id: 'fc-6',
    source: 'zhihu',
    sourceLabel: '知乎',
    topic: '产品设计',
    title: '为什么端侧 Agent 需要结构化 UI，而不是更长的聊天记录？',
    summary:
      '从“结果可比较”和“动作可确认”两个角度，分析聊天式界面在真实任务中的局限。',
    glyph: '知',
    cover: 'linear-gradient(135deg, #cfe3ff 0%, #9cc5f7 50%, #4f8bd8 100%)',
    readingTime: '9 分钟阅读',
    published: '2 天前',
    url: 'https://www.zhihu.com/',
    body: [
      '文章认为，聊天记录适合表达意图和解释，但不适合承载需要比较的选项。车次、航班、门店和邮件都有稳定的字段结构，用文本重复描述只会增加阅读成本。',
      '更重要的是动作。一个“确认支付”按钮必须绑定当前这笔交易，而不是让用户再输入一次“确认”。结构化 surface 可以把动作和真实数据 ID 绑定起来。',
      '作者也提醒：结构化不等于复杂。组件目录越大，模型越容易选错；先把 8–10 个核心组件打磨好，比堆 50 个组件更有效。'
    ],
    tags: ['A2UI', '交互设计', 'Agent'],
    metric: '684 赞同'
  },
  {
    id: 'fc-7',
    source: 'applepodcasts',
    sourceLabel: '播客',
    topic: 'AI 科技',
    title: '个人 Agent 的未来',
    summary:
      '一场 42 分钟的对话，讨论信任、记忆，以及为什么最好的 Agent 可能知道什么时候停下来。',
    glyph: '◍',
    cover: 'linear-gradient(135deg, #e5d4ff 0%, #c9a7f5 50%, #9268d6 100%)',
    readingTime: '42 分钟',
    published: '昨天',
    url: 'https://podcasts.apple.com/',
    body: [
      '主持人问：个人 Agent 应该记住什么？嘉宾把记忆分成情景记忆（发生了什么）、语义记忆（关于你的稳定事实）和程序记忆（你喜欢怎样做事）。',
      '大多数产品把三种记忆混成一个列表，导致修正非常困难。嘉宾建议向用户展示每条 claim、它的证据以及最近一次被使用的时间。',
      '关于信任，嘉宾说：“一个会说‘我不知道’的 Agent，比一个乱猜的 Agent 更有用，因为它把用户留在回路里。”'
    ],
    tags: ['播客', '记忆', '信任'],
    metric: '播客 · 1.2 万订阅'
  },
  {
    id: 'fc-8',
    source: 'github',
    sourceLabel: 'GitHub',
    topic: '开源项目',
    title: 'openJiuwen / DigitalMate —— 鸿蒙 Agent 客户端',
    summary:
      '一个面向鸿蒙的多模块 Agent 应用，包含 A2UI surface、云端会话和本地发现流管线。本周在鸿蒙话题下趋势上升。',
    glyph: '◈',
    cover: 'linear-gradient(135deg, #e2e4e8 0%, #b8bdc6 50%, #717884 100%)',
    readingTime: '6 分钟阅读',
    published: '本周趋势',
    url: 'https://github.com/openJiuwen-ai/DigitalMate',
    body: [
      '仓库围绕 entry HAP、agent core HAR 和 cloud adapter HAR 组织。最有意思的部分是云端任务与端侧聚合之间的分工。',
      'A2UI 目录定义了一个小型组件目录和流式 JSONL 协议。工具输出被要求是 surface，而不是不透明的文本。',
      '发现流维护本地库存，包含去重、排序和按账号隔离的持久化。对任何想在手机上做内容流的人来说，这是一个有用的参考。'
    ],
    tags: ['鸿蒙', 'Agent', '开源'],
    metric: '★ 4.2k'
  },
  {
    id: 'fc-9',
    source: 'steam',
    sourceLabel: 'Steam',
    topic: '城市生活',
    title: 'Steam Next Fest：五款值得一试的 Demo',
    summary:
      '一份小团队 Demo 清单，美术方向鲜明，从温馨管理模拟到战术卡牌构筑。',
    glyph: '◒',
    cover: 'linear-gradient(135deg, #c9d7ee 0%, #8fa8cf 50%, #3f5a86 100%)',
    readingTime: '7 分钟阅读',
    published: '昨天',
    url: 'https://store.steampowered.com/',
    body: [
      '这份清单偏爱尊重玩家时间的 Demo：十分钟内给出清晰钩子，存档系统可用，没有“先加愿望单才能继续”的假墙。',
      '最亮眼的是一款经营深夜咖啡店的小游戏。循环很简单，但节奏和音效设计非常自信。',
      '五款 Demo 在活动期间都免费。文章也提醒，活动结束后 Demo 是否继续提供可能会变化。'
    ],
    tags: ['游戏', 'Demo', '设计'],
    metric: 'Next Fest'
  },
  {
    id: 'fc-10',
    source: 'news',
    sourceLabel: '新闻',
    topic: 'AI 科技',
    title: '开源模型在移动端的推理优化进展',
    summary:
      '量化、投机解码和算子融合正在把 3B 级模型压进手机的可用区间，但内存带宽仍是主要瓶颈。',
    glyph: '◫',
    cover: 'linear-gradient(135deg, #cdeee4 0%, #92d5c4 50%, #3f9b86 100%)',
    readingTime: '5 分钟阅读',
    published: '4 小时前',
    url: 'https://www.example.com/',
    body: [
      '文章梳理了最近半年移动端推理的几条路线：更激进的量化、注意力算子融合，以及把长上下文拆成可缓存的块。',
      '测试数据显示，首 token 延迟改善明显，但持续生成速度受内存带宽限制。对 Agent 场景来说，首 token 延迟往往比峰值吞吐更重要。',
      '文章最后提醒，端侧模型并不适合所有任务。需要外部实时数据的查询仍应交给云端工具。'
    ],
    tags: ['端侧', '推理', '开源模型'],
    metric: '科技 · 5 分钟阅读'
  },
  {
    id: 'fc-11',
    source: 'news',
    sourceLabel: 'Global News',
    topic: 'AI 科技',
    title: 'AI 助手正从聊天走向任务',
    summary:
      '一份对助手产品的观察：从对话式回答转向带审批的多步骤任务执行。',
    glyph: '◧',
    cover: 'linear-gradient(135deg, #ffe6c7 0%, #f7c58b 50%, #d4934f 100%)',
    readingTime: '6 分钟阅读',
    published: '今天',
    url: 'https://www.example.com/',
    body: [
      '文章认为，聊天框是一个有用的第一界面，但它隐藏了长任务的状态。用户需要看见什么在运行、什么被阻塞、什么需要审批。',
      '那些把任务状态和审计轨迹展示出来的产品，完成率更高，尤其是涉及外部账号的任务。',
      '剩下的差距是信任：用户仍然希望有快速取消、撤销或回到原始来源核验结果的方式。'
    ],
    tags: ['助手', '任务', '信任'],
    metric: '国际 · 5 分钟阅读'
  },
  {
    id: 'fc-12',
    source: 'rss',
    sourceLabel: 'RSS',
    topic: '产品设计',
    title: '科技爱好者周刊：工具正在变得更像同事',
    summary:
      '本期关注个人知识库、端侧模型和小团队的工具选择，附一周值得读的链接。',
    glyph: 'R',
    cover: 'linear-gradient(135deg, #f6e6c8 0%, #e8cd96 50%, #b28b4d 100%)',
    readingTime: '12 分钟阅读',
    published: '今天',
    url: 'https://www.ruanyifeng.com/blog/',
    body: [
      '周刊把“工具”分成三类：放大器、代理人和同事。放大器等待指令，代理人执行任务，同事则会主动提醒和质疑。',
      '作者认为，大多数所谓 AI 产品还停留在放大器阶段。真正的同事型工具需要长期记忆、清晰的边界和可解释的动作。',
      '本期还收录了一篇关于本地优先软件的文章，以及一个用 RSS 重新组织信息流的实验。'
    ],
    tags: ['RSS', '周刊', '工具'],
    metric: 'RSS 订阅'
  },
  {
    id: 'fc-13',
    source: 'youtube',
    sourceLabel: 'YouTube',
    topic: '机器人',
    title: '人形机器人从演示走向工厂班次',
    summary:
      '一篇现场观察：安全围栏、遥操作，以及决定人形机器人能否撑完一个班次的中间件工作。',
    glyph: '◈',
    cover: 'linear-gradient(135deg, #d7e8dd 0%, #9bc7b4 45%, #3f7d6c 100%)',
    readingTime: '14:06',
    published: '3 小时前',
    url: 'https://www.youtube.com/',
    body: [
      '视频里的工厂地面刻意做得很无聊：划好的通道、缓慢的传送带，以及重复四个抓取动作的机器人。重点不是高光集锦，而是持续运行时间。',
      '工程师介绍了台面下的工作：标定、跌倒恢复、远程协助，以及把机器人状态与工厂排程对齐的中间件层。',
      '最后比较了遥操作与受控自主。两种方式都保留人类在环，差别在于机器人能多快发出求助。'
    ],
    tags: ['机器人', '具身智能', '安全'],
    metric: '2.1 万次观看'
  }
];

export const seedSkills: Skill[] = [
  {
    id: 'general',
    name: '默认分身',
    icon: '✦',
    category: '效率',
    description: '任务拆解、写作、总结与日常问答。',
    author: 'DigitalMate',
    installed: true,
    enabled: true,
    builtin: true
  },
  {
    id: 'travel',
    name: '出行规划',
    icon: '🧭',
    category: '出行',
    description: '比较高铁与航班，整理行程和换乘建议。',
    author: 'DigitalMate',
    installed: true,
    enabled: true
  },
  {
    id: 'train',
    name: '高铁查询',
    icon: '🚄',
    category: '出行',
    description: '查询 12306 余票与价格，保留来源。',
    author: 'DigitalMate',
    installed: true,
    enabled: true
  },
  {
    id: 'mail',
    name: '邮件草稿',
    icon: '✉️',
    category: '效率',
    description: '汇总 Gmail 与 QQ 邮箱，起草但不发送。',
    author: 'DigitalMate',
    installed: false,
    enabled: false
  },
  {
    id: 'calendar',
    name: '日程规划',
    icon: '🗓️',
    category: '效率',
    description: '读取 Google Calendar，创建和调整日程。',
    author: 'DigitalMate',
    installed: true,
    enabled: false
  },
  {
    id: 'discovery',
    name: '内容发现',
    icon: '◎',
    category: '生活',
    description: '按兴趣聚合视频、文章和讨论，保留来源。',
    author: 'DigitalMate',
    installed: true,
    enabled: true
  },
  {
    id: 'shopping',
    name: '购物比价',
    icon: '🛍️',
    category: '生活',
    description: '比较公开页面上的规格与价格，不推断库存。',
    author: 'Community',
    installed: false,
    enabled: false
  },
  {
    id: 'research',
    name: '代码研究',
    icon: '⌘',
    category: '研究',
    description: '阅读仓库、追踪调用链并给出可验证的结论。',
    author: 'Community',
    installed: true,
    enabled: true
  },
  {
    id: 'coffee',
    name: '咖啡与本地生活',
    icon: '☕',
    category: '生活',
    description: '按位置、距离和评分聚合附近门店。',
    author: 'DigitalMate',
    installed: true,
    enabled: true
  }
];

export const memoryProfile: MemoryProfile = {
  name: '林未',
  headline: '产品设计师 · 深圳',
  summary:
    '关注 AI Agent、鸿蒙与开源工具。喜欢把复杂任务拆成可验证的小步骤，也喜欢在周末找一家安静的咖啡店读书。',
  tags: ['AI Agent', '鸿蒙', '开源', '咖啡', '城市漫步'],
  mbti: 'INTJ · 68% 置信度',
  sections: [
    {
      title: '身份与经历',
      body: '在深圳做产品设计，参与过移动端工具和内容产品。最近一年主要在做 Agent 交互与结构化界面。',
      evidence: '来自本地演示画像 · 可在设置中编辑'
    },
    {
      title: '兴趣与偏好',
      body: '偏好低饱和、暖白的视觉；喜欢看设计复盘和工程实现细节。咖啡通常点燕麦拿铁，少糖。',
      evidence: '根据收藏卡片和互动推断 · 演示数据'
    },
    {
      title: '沟通风格',
      body: '喜欢先看结论，再看证据。不喜欢过度营销式的措辞，希望失败和限制被明确写出来。',
      evidence: '根据聊天偏好推断 · 演示数据'
    },
    {
      title: '近期关注',
      body: '端侧记忆、A2UI 组件目录、发现流的去重与排序，以及鸿蒙 2in1 的适配。',
      evidence: '来自发现流主题 · 演示数据'
    }
  ]
};
