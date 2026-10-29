import type { A2uiSurface, CalendarEvent } from '../types';
import { makeSurface } from './makeSurface';

export { makeSurface };

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

export function calendarSurface(extraEvents: CalendarEvent[] = []): A2uiSurface {
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
        { time: '16:30', title: '发现流排序实验复盘', meta: '与 Data 组 · 30 分钟', tone: 'flight' },
        ...extraEvents
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

export function hotelSurface(): A2uiSurface {
  return makeSurface(
    '酒店方案',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '深圳 · 南山', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'hotels', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: '入住条件', dataPath: '/summary' },
      { id: 'hotels', component: 'HotelOptions', title: '明天入住 · 2 晚', dataPath: '/hotels' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: '未进行预订',
        body: '我可以比较房型和来源，但预订与支付需要你在服务商页面完成。房价会实时变化。',
        actions: [
          { id: 'hotel-cheaper', label: '看更便宜的酒店', prompt: '看看深圳南山更便宜的酒店', variant: 'secondary' },
          { id: 'hotel-refundable', label: '只看可免费取消', prompt: '看看深圳可免费取消的酒店', variant: 'ghost' }
        ]
      }
    ],
    {
      summary: [
        { label: '入住', value: '明天 · 10 月 30 日' },
        { label: '晚数', value: '2 晚' },
        { label: '住客', value: '1 位成人 · 1 间房' },
        { label: '筛选', value: '4.5 分以上 · 可免费取消' },
        { label: '来源', value: '携程 · Booking' }
      ],
      hotels: [
        {
          name: '深圳湾万豪酒店',
          area: '南山 · 1.2 公里',
          rating: '4.7',
          price: '¥1,180 / 晚',
          distance: '步行 12 分钟',
          tags: ['可免费取消', '含早餐'],
          sourceTag: '携程'
        },
        {
          name: '深圳湾亚朵酒店',
          area: '南山 · 2.4 公里',
          rating: '4.6',
          price: '¥620 / 晚',
          distance: '驾车 8 分钟',
          tags: ['可免费取消', '健身房'],
          sourceTag: 'Booking'
        },
        {
          name: '深圳东门凯悦嘉轩',
          area: '罗湖 · 9.8 公里',
          rating: '4.5',
          price: '¥780 / 晚',
          distance: '驾车 25 分钟',
          tags: ['含早餐', '延迟退房'],
          sourceTag: '携程'
        }
      ]
    },
    '本地演示 · 不预订、不支付'
  );
}

export function rideSurface(): A2uiSurface {
  return makeSurface(
    '打车方案',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '前往深圳宝安机场', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'rides', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: '行程信息', dataPath: '/summary' },
      { id: 'rides', component: 'RideOptions', title: '明天 17:30 上车', dataPath: '/rides' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: '下单仍在服务商完成',
        body: '价格为服务商接口返回的预估值。我不会替你叫车，也不会扣款。',
        actions: [
          { id: 'ride-later', label: '晚 30 分钟出发', prompt: '看看晚 30 分钟去机场的车', variant: 'secondary' },
          { id: 'ride-pool', label: '看拼车', prompt: '看看去深圳机场的拼车', variant: 'ghost' }
        ]
      }
    ],
    {
      summary: [
        { label: '出发', value: '坂田华为基地' },
        { label: '到达', value: '深圳宝安机场' },
        { label: '上车', value: '明天 · 17:30' },
        { label: '乘车', value: '1 位乘客 · 2 件行李' },
        { label: '路况', value: '畅通 · 预计 42 分钟' }
      ],
      rides: [
        { provider: '滴滴快车', car: '经济型', eta: '3 分钟后到达', price: '¥86–102', distance: '42 分钟 · 38 公里', sourceTag: '滴滴' },
        { provider: '滴滴专车', car: '舒适型', eta: '5 分钟后到达', price: '¥128–150', distance: '41 分钟 · 38 公里', sourceTag: '滴滴' },
        { provider: '出租车', car: '打表', eta: '8 分钟后到达', price: '≈ ¥110', distance: '44 分钟 · 39 公里', sourceTag: '本地出租' }
      ]
    },
    '本地演示 · 不会叫车'
  );
}

export function paymentSurface(): A2uiSurface {
  return makeSurface(
    '支付确认',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '订单确认', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'payment', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: '订单摘要', dataPath: '/summary' },
      { id: 'payment', component: 'PaymentCard', dataPath: '/payment' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: '支付未提交',
        body: '这是演示数据生成的支付确认卡。真实客户端会要求显式确认，并绑定服务商返回的 orderId。',
        actions: [
          { id: 'payment-cancel', label: '取消订单', prompt: '取消演示订单', variant: 'ghost' },
          { id: 'payment-method', label: '更换支付方式', prompt: '更换这个订单的支付方式', variant: 'secondary' }
        ]
      }
    ],
    {
      summary: [
        { label: '商家', value: '瑞幸咖啡 · 华为基地店' },
        { label: '订单', value: '2 件商品 · 15:10 取餐' },
        { label: '小计', value: '¥32.00' },
        { label: '优惠', value: '− ¥6.00' },
        { label: '合计', value: '¥26.00' }
      ],
      payment: {
        title: '确认支付',
        merchant: '瑞幸咖啡',
        amount: '¥26.00',
        method: '钱包 · 余额 ¥120.00',
        status: '等待确认',
        note: '在你于服务商页面确认之前，不会产生任何扣款。'
      }
    },
    '本地演示 · 不会扣款'
  );
}

export function mediaSurface(): A2uiSurface {
  return makeSurface(
    '媒体精选',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '今日媒体', status: 'ready' },
      { id: 'body', component: 'Column', children: ['tabs', 'media', 'note'] },
      { id: 'tabs', component: 'SceneTabs', dataPath: '/tabs' },
      { id: 'media', component: 'MediaSlider', title: '通勤精选', dataPath: '/media' },
      {
        id: 'note',
        component: 'Text',
        text: '媒体条目为演示数据。真实客户端会串流已授权的播客和视频，并在本地保留播放进度。'
      }
    ],
    {
      tabs: [{ label: '为你推荐' }, { label: '播客' }, { label: '短视频' }, { label: '已收藏' }],
      media: [
        { kind: '播客', title: '如何设计安全失败的智能体界面', meta: '32 分钟 · 科技周刊' },
        { kind: '视频', title: '五分钟看懂 A2UI', meta: '5 分钟 · DigitalMate' },
        { kind: '播客', title: '本地优先应用的落地', meta: '48 分钟 · 离线俱乐部' },
        { kind: '视频', title: '4K 深圳通勤', meta: '3 分钟 · 城市笔记' }
      ]
    },
    '本地演示 · 不串流媒体'
  );
}

export function approvalSurface(): A2uiSurface {
  return makeSurface(
    '审批与连接',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '工具访问审核', status: 'ready' },
      { id: 'body', component: 'Column', children: ['approval', 'quota', 'note'] },
      { id: 'approval', component: 'ApprovalCard', dataPath: '/approval', actions: [
        { id: 'approve-demo', label: '允许一次', prompt: '批准演示工具访问', variant: 'primary' },
        { id: 'deny-demo', label: '暂不允许', prompt: '取消演示审批', variant: 'ghost' }
      ] },
      { id: 'quota', component: 'ConnectionQuotaCard', title: '连接配额', dataPath: '/quota' },
      {
        id: 'note',
        component: 'Text',
        text: '这是本地审批与配额演示，不会创建账号、OAuth 授权或真实工具连接。'
      }
    ],
    {
      approval: {
        title: '连接本地出行工具？',
        body: '请求只读访问演示用的 12306 与 VariFlight 来源。',
        risk: '中风险',
        expires: '10 分钟内有效',
        scope: '仅当前浏览器'
      },
      quota: {
        service: 'Orbit 桥接',
        status: '演示',
        plan: '本地会话',
        used: '12',
        limit: '60 次请求',
        percent: 20,
        reset: '40 分钟后重置',
        note: '不使用真实连接或账号。'
      }
    },
    '本地演示 · 不会授予真实权限'
  );
}

export function serviceErrorSurface(): A2uiSurface {
  return makeSurface(
    '操作未完成',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '无法完成此操作', status: 'error' },
      { id: 'body', component: 'Column', children: ['error', 'next'] },
      {
        id: 'error',
        component: 'ErrorNotice',
        title: '没有实时可用结果',
        body: '演示来源没有返回可预订选项。没有进行预留、扣款或发送。'
      },
      {
        id: 'next',
        component: 'ConfirmPanel',
        title: '你可以这样做',
        body: '换一个日期、查看模拟选项，或手动检查来源。',
        actions: [
          { id: 'error-retry', label: '查看模拟选项', prompt: '查明天北京到上海的高铁', variant: 'primary' },
          { id: 'error-coffee', label: '做点别的', prompt: '附近有什么咖啡店', variant: 'ghost' }
        ]
      }
    ],
    {},
    '明确的失败状态 · 无副作用'
  );
}

export function shoppingSurface(): A2uiSurface {
  return makeSurface(
    '购物清单',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '本周采购', status: 'ready' },
      { id: 'body', component: 'Column', children: ['hero', 'checklist', 'budget', 'actions'] },
      {
        id: 'hero',
        component: 'HeroBanner',
        title: '6 件商品，约 ¥86',
        body: '一份本地采购清单。可以在这里勾选完成；不会下单，也不使用任何商店账号。'
      },
      { id: 'checklist', component: 'Checklist', title: '待购买', dataPath: '/items' },
      { id: 'budget', component: 'InfoRows', title: '预算', dataPath: '/budget' },
      {
        id: 'actions',
        component: 'ActionBar',
        actions: [
          { id: 'shop-nearby', label: '找附近门店', prompt: '附近有什么咖啡店', variant: 'primary' },
          { id: 'shop-brief', label: '安排今天', prompt: '看看今日简报', variant: 'ghost' }
        ]
      }
    ],
    {
      items: [
        { label: '燕麦奶', note: '1 升 · 无糖', meta: '¥18', checked: false },
        { label: '咖啡豆', note: '中深烘焙 · 250 克', meta: '¥32', checked: false },
        { label: '香蕉', note: '约 6 根', meta: '¥9', checked: true },
        { label: '希腊酸奶', note: '4 杯', meta: '¥16', checked: false },
        { label: '全麦面包', note: '1 袋', meta: '¥11', checked: false }
      ],
      budget: [
        { label: '预计合计', value: '¥86' },
        { label: '剩余预算', value: '¥14', tone: 'success' },
        { label: '门店', value: '本地演示 · 不下单' }
      ]
    },
    '本地演示 · 不下单、不支付'
  );
}

export function dailyBriefSurface(): A2uiSurface {
  return makeSurface(
    '每日简报',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '周二 · 今日概览', status: 'ready' },
      { id: 'body', component: 'Column', children: ['hero', 'metrics', 'schedule', 'priorities', 'actions'] },
      {
        id: 'hero',
        component: 'HeroBanner',
        title: '早上好，林未',
        body: '今天有 3 场会议、4 小时专注时间和 09:30 的设计评审。今天没有需要预订或支付的事项。'
      },
      { id: 'metrics', component: 'MetricGrid', title: '今天', dataPath: '/metrics' },
      { id: 'schedule', component: 'ScheduleStack', title: '接下来', dataPath: '/schedule' },
      { id: 'priorities', component: 'List', title: '优先事项', dataPath: '/priorities' },
      {
        id: 'actions',
        component: 'ActionBar',
        actions: [
          { id: 'brief-calendar', label: '查看日历', prompt: '帮我查看明天的日程', variant: 'primary' },
          { id: 'brief-coffee', label: '附近咖啡', prompt: '附近有什么咖啡店', variant: 'ghost' }
        ]
      }
    ],
    {
      metrics: [
        { label: '会议', value: '3 场', tone: 'flight' },
        { label: '专注时间', value: '4 小时', tone: 'success' },
        { label: '待办', value: '6 项', tone: 'accent' },
        { label: '天气', value: '26–31°C', tone: 'train' }
      ],
      schedule: [
        { time: '09:30', title: '设计评审 · A2UI 卡片', meta: '会议室 3A · 45 分钟', tone: 'accent' },
        { time: '14:00', title: '真机回归 · 登录与通知', meta: '线上 · 60 分钟', tone: 'train' },
        { time: '16:30', title: '发现流排序实验复盘', meta: '与 Data 组 · 30 分钟', tone: 'flight' }
      ],
      priorities: [
        { title: '完成 A2UI 协议演示', subtitle: '解析器、存储与组件目录', meta: '高' },
        { title: '复核记忆文案', subtitle: '保留证据与限制说明', meta: '中' },
        { title: '测试离线刷新', subtitle: '生产构建、断网加载', meta: '中' }
      ]
    },
    '本地演示 · 无需账号'
  );
}

export function insightsSurface(): A2uiSurface {
  return makeSurface(
    '每周洞察',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: '本周 · 10 月 20–26 日', status: 'ready' },
      { id: 'body', component: 'Column', children: ['metrics', 'mix', 'activity', 'focus', 'note'] },
      { id: 'metrics', component: 'MetricGrid', title: '本周概览', dataPath: '/metrics' },
      { id: 'mix', component: 'SegmentedRingChart', title: '任务构成', dataPath: '/taskMix' },
      { id: 'activity', component: 'MultiSeriesLineChart', title: '活跃分钟', dataPath: '/activity' },
      { id: 'focus', component: 'MatrixHeatmap', title: '按小时查看专注度', dataPath: '/focus' },
      {
        id: 'note',
        component: 'Text',
        text: '这些数字仅来自演示活动。真实客户端会根据任务回执计算，并把原始事件保留在本地。'
      }
    ],
    {
      metrics: [
        { label: '活跃天数', value: '6 天', tone: 'accent' },
        { label: '任务数', value: '42', tone: 'train' },
        { label: '专注时长', value: '11 小时 20 分', tone: 'success' },
        { label: '完成率', value: '86%', tone: 'flight' }
      ],
      taskMix: [
        { label: '资料研究', value: 18, percent: 43, tone: 'accent' },
        { label: '出行规划', value: 12, percent: 29, tone: 'train' },
        { label: '日程安排', value: 7, percent: 17, tone: 'flight' },
        { label: '其他', value: 5, percent: 11, tone: 'muted' }
      ],
      activity: {
        labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        series: [
          { name: '专注', tone: 'accent', points: [45, 70, 55, 90, 65, 30, 25] },
          { name: '空闲', tone: 'muted', points: [20, 25, 15, 30, 20, 40, 50] }
        ]
      },
      focus: {
        cols: ['9', '11', '13', '15', '17', '19'],
        rows: ['周一', '周二', '周三', '周四', '周五'],
        values: [
          [1, 2, 3, 2, 1, 0],
          [2, 3, 4, 3, 2, 1],
          [1, 2, 4, 3, 2, 0],
          [3, 4, 3, 4, 2, 1],
          [2, 3, 2, 3, 4, 2]
        ]
      }
    },
    '本地演示 · 活动回执为模拟数据'
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
