import type { A2uiComponent, A2uiSurface } from '../types';

let surfaceSeq = 0;

export function makeSurface(
  title: string,
  components: A2uiComponent[],
  data: Record<string, unknown> = {},
  subtitle?: string
): A2uiSurface {
  surfaceSeq += 1;
  const map: Record<string, A2uiComponent> = {};
  for (const component of components) map[component.id] = component;
  return {
    id: `surface_${surfaceSeq}_${Date.now().toString(36)}`,
    title,
    subtitle,
    status: 'ready',
    root: components[0]?.id ?? 'root',
    components: map,
    data
  };
}

export function travelSurface(): A2uiSurface {
  return makeSurface(
    '出行方案',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '北京 → 上海', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'options', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: '查询条件', dataPath: '/summary' },
      { id: 'options', component: 'TravelOptions', title: '明天傍晚 · 按出发时间排序', dataPath: '/options' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: '执行边界',
        body: '我可以整理方案和来源，不会自动订票、支付或抢票。购票请以 12306 或航司页面为准。',
        actions: [
          { id: 'morning', label: '换到上午', prompt: '帮我查明天上午北京到上海的高铁', variant: 'secondary' },
          { id: 'train-only', label: '只看高铁', prompt: '只看高铁，帮我重新整理明天北京到上海的方案', variant: 'ghost' }
        ]
      }
    ],
    {
      summary: [
        { label: '出发', value: '北京南 / 首都机场' },
        { label: '到达', value: '上海虹桥' },
        { label: '日期', value: '明天 · 10月29日' },
        { label: '筛选', value: '18:00 之后 · 有票' },
        { label: '来源', value: '12306 · 飞常准' }
      ],
      options: [
        {
          kind: 'train',
          code: 'G21',
          from: '北京南',
          to: '上海虹桥',
          depart: '18:00',
          arrive: '22:36',
          duration: '4小时36分',
          price: '¥553 起',
          seats: '二等座有票',
          sourceTag: '高铁 · 12306',
          status: 'success'
        },
        {
          kind: 'train',
          code: 'G23',
          from: '北京南',
          to: '上海虹桥',
          depart: '18:35',
          arrive: '23:12',
          duration: '4小时37分',
          price: '¥553 起',
          seats: '二等座 6 张',
          sourceTag: '高铁 · 12306',
          status: 'success'
        },
        {
          kind: 'flight',
          code: 'CA1859',
          from: '首都 T3',
          to: '虹桥 T2',
          depart: '19:10',
          arrive: '21:25',
          duration: '2小时15分',
          price: '¥980 起',
          seats: '经济舱 8 折',
          sourceTag: '飞机 · 飞常准',
          status: 'success'
        },
        {
          kind: 'flight',
          code: 'MU5102',
          from: '首都 T2',
          to: '虹桥 T2',
          depart: '19:45',
          arrive: '22:05',
          duration: '2小时20分',
          price: '¥1040 起',
          seats: '经济舱 9 折',
          sourceTag: '飞机 · 飞常准',
          status: 'success'
        }
      ]
    },
    '高铁与航班混合排序，来源已保留'
  );
}

export function morningTravelSurface(): A2uiSurface {
  const surface = travelSurface();
  surface.title = '上午出行方案';
  surface.data.summary = [
    { label: '出发', value: '北京南 / 首都机场' },
    { label: '到达', value: '上海虹桥' },
    { label: '日期', value: '明天 · 10月29日' },
    { label: '筛选', value: '08:00 – 12:00' },
    { label: '来源', value: '12306 · 飞常准' }
  ];
  surface.data.options = [
    {
      kind: 'train',
      code: 'G1',
      from: '北京南',
      to: '上海虹桥',
      depart: '09:00',
      arrive: '13:28',
      duration: '4小时28分',
      price: '¥553 起',
      seats: '二等座有票',
      sourceTag: '高铁 · 12306',
      status: 'success'
    },
    {
      kind: 'train',
      code: 'G3',
      from: '北京南',
      to: '上海虹桥',
      depart: '10:00',
      arrive: '14:29',
      duration: '4小时29分',
      price: '¥553 起',
      seats: '二等座 12 张',
      sourceTag: '高铁 · 12306',
      status: 'success'
    },
    {
      kind: 'flight',
      code: 'CA1831',
      from: '首都 T3',
      to: '虹桥 T2',
      depart: '10:30',
      arrive: '12:45',
      duration: '2小时15分',
      price: '¥760 起',
      seats: '经济舱 7 折',
      sourceTag: '飞机 · 飞常准',
      status: 'success'
    }
  ];
  return surface;
}

export function trainOnlySurface(): A2uiSurface {
  return makeSurface(
    '高铁方案',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '只看高铁', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'options', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: '查询条件', dataPath: '/summary' },
      { id: 'options', component: 'TrainOptions', title: '明天 · 北京南 → 上海虹桥', dataPath: '/trains' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: '购票说明',
        body: '车次与余票来自 12306 查询结果。展开任一车次可在 App 内打开 12306 官网继续购票。',
        actions: [{ id: 'all', label: '加上航班', prompt: '把航班也一起列出来', variant: 'secondary' }]
      }
    ],
    {
      summary: [
        { label: '出发', value: '北京南' },
        { label: '到达', value: '上海虹桥' },
        { label: '日期', value: '明天 · 10月29日' },
        { label: '筛选', value: '18:00 之后' }
      ],
      trains: [
        {
          trainCode: 'G21',
          from: '北京南',
          to: '上海虹桥',
          depart: '18:00',
          arrive: '22:36',
          duration: '4小时36分',
          seats: '二等座有票',
          price: '¥553 起',
          sourceTag: '高铁 · 12306'
        },
        {
          trainCode: 'G23',
          from: '北京南',
          to: '上海虹桥',
          depart: '18:35',
          arrive: '23:12',
          duration: '4小时37分',
          seats: '二等座 6 张',
          price: '¥553 起',
          sourceTag: '高铁 · 12306'
        },
        {
          trainCode: 'G25',
          from: '北京南',
          to: '上海虹桥',
          depart: '19:00',
          arrive: '23:38',
          duration: '4小时38分',
          seats: '一等座 3 张',
          price: '¥933 起',
          sourceTag: '高铁 · 12306'
        }
      ]
    },
    '仅保留 12306 可验证结果'
  );
}

export function foodSurface(): A2uiSurface {
  return makeSurface(
    '附近咖啡',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '深圳 · 坂田华为基地', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'foods', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: '聚合条件', dataPath: '/summary' },
      { id: 'foods', component: 'FoodChoices', title: '按距离与评分合并', dataPath: '/foods' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: '只查询，不下单',
        body: '门店、营业状态和参考价来自本地生活服务商。下单、领券和支付需要在对应平台确认。',
        actions: [
          { id: 'luckin', label: '只看瑞幸', prompt: '帮我看看附近瑞幸有什么可选', variant: 'secondary' },
          { id: 'meal', label: '找点吃的', prompt: '附近有什么适合午餐的店', variant: 'ghost' }
        ]
      }
    ],
    {
      summary: [
        { label: '位置', value: '坂田华为基地 · 1.5km' },
        { label: '关键词', value: '咖啡 · 可久坐' },
        { label: '已聚合', value: '高德 · 美团 · 瑞幸' },
        { label: '来源状态', value: '3 正常 / 0 失败' }
      ],
      foods: [
        {
          name: '% Arabica（万象天地店）',
          category: '咖啡 · 轻食',
          distance: '480m',
          address: '南山区深南大道 9668 号',
          rating: '4.8',
          price: '¥32/人',
          open: '营业中',
          sourceTags: ['高德', '美团']
        },
        {
          name: 'Manner Coffee（坂田万科店）',
          category: '咖啡 · 烘焙',
          distance: '720m',
          address: '龙岗区坂田街道万科城',
          rating: '4.7',
          price: '¥22/人',
          open: '营业中',
          sourceTags: ['高德', '腾讯地图']
        },
        {
          name: 'Seesaw Coffee（天安云谷店）',
          category: '精品咖啡',
          distance: '1.1km',
          address: '龙岗区天安云谷产业园',
          rating: '4.6',
          price: '¥38/人',
          open: '营业中',
          sourceTags: ['高德', '美团']
        },
        {
          name: '瑞幸咖啡（华为基地店）',
          category: '咖啡 · 快取',
          distance: '260m',
          address: '龙岗区华为基地一路',
          rating: '4.5',
          price: '¥16/人',
          open: '营业中',
          sourceTags: ['瑞幸 MCP', '高德']
        }
      ]
    },
    '4 个来源返回，按门店名去重'
  );
}

export function socialSurface(): A2uiSurface {
  return makeSurface(
    '社交聚合',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '今天 · SocialHub', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'social', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: '连接状态', dataPath: '/summary' },
      { id: 'social', component: 'SocialHub', title: '未读与提及', dataPath: '/items' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: '回复需要确认',
        body: '这里只展示授权账号的私信、提及和连接状态。公开帖子不会进入 SocialHub；发送草稿前会再次确认。',
        actions: [
          { id: 'draft', label: '起草回复', prompt: '帮我给 Slack 里的这条消息起草回复', variant: 'secondary' },
          { id: 'x', label: '看 X 公开帖', prompt: '帮我查看 X 上 openai 最近的公开 post', variant: 'ghost' }
        ]
      }
    ],
    {
      summary: [
        { label: 'X', value: '已连接 · 2 条未读', tone: 'success' },
        { label: 'Slack', value: '已连接 · 1 条提及', tone: 'success' },
        { label: '企业微信', value: '本地回调缓存', tone: 'muted' }
      ],
      items: [
        {
          author: 'Lin Wei',
          handle: '@linwei',
          channel: 'X',
          text: 'DigitalMate 的 A2UI 方案很有意思：模型只输出声明式组件，客户端负责渲染。',
          time: '09:42',
          unread: true
        },
        {
          author: 'Design Systems',
          handle: '#dm-design',
          channel: 'Slack',
          text: '新的暖白主题已经合入，发现流卡片的对比度还需要再看一版。',
          time: '09:18',
          unread: true
        },
        {
          author: '项目群',
          handle: '企业微信',
          channel: '企业微信',
          text: '本周五做一次真机回归，重点看登录、后台任务和通知跳转。',
          time: '昨天',
          unread: false
        }
      ]
    },
    '3 个连接 · 未读按时间排序'
  );
}

export function mailSurface(): A2uiSurface {
  return makeSurface(
    '邮箱摘要',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '重要邮件', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'results', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: '聚合结果', dataPath: '/summary' },
      { id: 'results', component: 'GenericToolResults', title: '最近 3 封', dataPath: '/results' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: '草稿不发送',
        body: '可以基于真实线程创建草稿，但不会自动发送。Gmail 发送属于 manual-only 路径。',
        actions: [{ id: 'draft', label: '起草回复', prompt: '帮我给最近一封邮件起草回复', variant: 'secondary' }]
      }
    ],
    {
      summary: [
        { label: 'Gmail', value: '2 封重要', tone: 'success' },
        { label: 'QQ 邮箱', value: '1 封重要', tone: 'success' },
        { label: 'Outlook', value: '未配置', tone: 'muted' }
      ],
      results: [
        {
          title: 'Q4 roadmap review — action items',
          subtitle: 'Alice Chen · 产品',
          meta: '今天 08:54 · Gmail',
          status: '未读'
        },
        {
          title: '关于测试环境证书续期的说明',
          subtitle: '运维通知',
          meta: '昨天 19:20 · QQ 邮箱',
          status: ''
        },
        {
          title: 'Your invoice is ready',
          subtitle: 'Billing',
          meta: '昨天 11:02 · Gmail',
          status: ''
        }
      ]
    },
    'Gmail 与 QQ 邮箱合并，按时间排序'
  );
}

export function calendarSurface(): A2uiSurface {
  return makeSurface(
    '本周日程',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Google Calendar', status: 'ready' },
      { id: 'body', component: 'Column', children: ['metrics', 'schedule', 'boundary'] },
      { id: 'metrics', component: 'MetricGrid', title: '本周概览', dataPath: '/metrics' },
      { id: 'schedule', component: 'ScheduleStack', title: '接下来', dataPath: '/schedule' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: '写入需要确认',
        body: '创建、修改和删除日程都会先展示确认卡片，并绑定真实 eventId。',
        actions: [{ id: 'create', label: '新建日程', prompt: '帮我在明天下午 3 点创建一个 30 分钟的评审日程', variant: 'secondary' }]
      }
    ],
    {
      metrics: [
        { label: '会议', value: '6 场', tone: 'accent' },
        { label: '专注时段', value: '4.5h', tone: 'success' },
        { label: '冲突', value: '1 处', tone: 'warning' },
        { label: '待确认', value: '2 个', tone: 'muted' }
      ],
      schedule: [
        { time: '10:00', title: '设计评审 · A2UI 卡片', meta: '会议室 3A · 45 分钟', tone: 'accent' },
        { time: '14:00', title: '真机回归 · 登录与通知', meta: '线上 · 60 分钟', tone: 'train' },
        { time: '16:30', title: '发现流排序实验复盘', meta: '与 Data 组 · 30 分钟', tone: 'flight' }
      ]
    },
    '来自已授权的 Google Calendar'
  );
}

export function documentSurface(): A2uiSurface {
  return makeSurface(
    '文档摘要',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'requirements-v3.pdf', status: 'ready' },
      { id: 'body', component: 'Column', children: ['metrics', 'summary', 'actions'] },
      { id: 'metrics', component: 'MetricGrid', title: '阅读结果', dataPath: '/metrics' },
      {
        id: 'summary',
        component: 'Text',
        text:
          '**核心结论**\n\n1. 首页需要同时承载云端任务与本地能力，但两者的工具目录必须分开配置。\n2. 发现流的库存、去重和排序应在账号维度隔离，并在重启后恢复。\n3. 所有外部写入都必须经过确认；支付、发送、下单和删除不能自动重试。\n\n**主要风险**\n\n- 云端服务未部署时，客户端只能展示真实失败，不能伪造结果。\n- AGC 登录、签名与应用身份必须匹配，否则真机无法进入主界面。'
      },
      {
        id: 'actions',
        component: 'ActionBar',
        actions: [
          { id: 'plan', label: '整理下一步', prompt: '根据这份文档，帮我整理下一步工作清单', variant: 'primary' },
          { id: 'risk', label: '只看风险', prompt: '把这份文档里的风险单独列出来', variant: 'ghost' }
        ]
      }
    ],
    {
      metrics: [
        { label: '页数', value: '12 页', tone: 'accent' },
        { label: '关键问题', value: '4 个', tone: 'muted' },
        { label: '风险', value: '3 项', tone: 'warning' },
        { label: '下一步', value: '2 项', tone: 'success' }
      ]
    },
    '本地解析 · 未上传原文'
  );
}

export function genericSurface(title: string, rows: { title: string; subtitle: string; meta: string; status?: string }[]): A2uiSurface {
  return makeSurface(
    title,
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title, status: 'ready' },
      { id: 'body', component: 'Column', children: ['results'] },
      { id: 'results', component: 'GenericToolResults', dataPath: '/results' }
    ],
    { results: rows },
    '本地演示数据'
  );
}

export function weatherSurface(): A2uiSurface {
  return makeSurface(
    '天气',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '深圳 · 明天', status: 'ready' },
      { id: 'body', component: 'Column', children: ['metrics', 'summary'] },
      { id: 'metrics', component: 'MetricGrid', dataPath: '/metrics' },
      {
        id: 'summary',
        component: 'Text',
        text:
          '明天深圳多云间晴，26–31°C，东南风 2 级。午后有短时阵雨概率 30%，出门建议带伞。\n\n来源：高德天气 · 更新于 09:20'
      }
    ],
    {
      metrics: [
        { label: '最高', value: '31°C', tone: 'warning' },
        { label: '最低', value: '26°C', tone: 'flight' },
        { label: '降水', value: '30%', tone: 'accent' },
        { label: '空气质量', value: '优', tone: 'success' }
      ]
    },
    '高德天气'
  );
}
