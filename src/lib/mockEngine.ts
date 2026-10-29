import type { A2uiSurface, Language } from '../types';
import { surfacesFor } from '../data/surfaces';

export interface MockReply {
  thinking: string[];
  text: string;
  surface?: A2uiSurface;
  followUps?: string[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function replyFor(prompt: string, lang: Language): MockReply {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const tr = (english: string, chinese: string): string => (lang === 'zh' ? chinese : english);
  const S = surfacesFor(lang);

  const luckinOnlySurface = (): A2uiSurface => {
    const surface = clone(S.foodSurface());
    surface.title = tr('Luckin nearby', '附近瑞幸');
    surface.subtitle = tr('Only places returned by the Luckin MCP', '仅保留瑞幸 MCP 返回的门店');
    const foods = (surface.data.foods as Array<Record<string, unknown>>) ?? [];
    surface.data.foods = foods.filter(food => {
      const name = String(food.name);
      return name.includes('Luckin') || name.includes('瑞幸');
    });
    surface.data.summary = [
      { label: tr('Location', '位置'), value: tr('Bantian Huawei Campus · 1.5 km', '坂田华为基地 · 1.5km') },
      { label: tr('Keywords', '关键词'), value: tr('Luckin · orderable stores', '瑞幸 · 可下单门店') },
      { label: tr('Sources', '来源'), value: tr('Luckin MCP · Amap', '瑞幸 MCP · 高德') },
      { label: tr('Source status', '来源状态'), value: tr('2 healthy / 0 failed', '2 正常 / 0 失败') }
    ];
    return surface;
  };

  const xPostsSurface = (): A2uiSurface =>
    S.genericSurface(tr('Public posts on X', 'X 公开帖子'), [
      {
        title: '@openai: A small update to how we think about agents and tools.',
        subtitle: tr('OpenAI · public account', 'OpenAI · 公开账号'),
        meta: tr('Today 08:12 · X', '今天 08:12 · X'),
        status: tr('Public', '公开')
      },
      {
        title: '@simonw: The best agent demos are the ones that show the failure path.',
        subtitle: 'Simon Willison',
        meta: tr('Yesterday 22:40 · X', '昨天 22:40 · X'),
        status: tr('Public', '公开')
      },
      {
        title: '@hw_developers: HarmonyOS 6.1 SDK is now available.',
        subtitle: 'Huawei Developers',
        meta: tr('Yesterday 18:05 · X', '昨天 18:05 · X'),
        status: tr('Public', '公开')
      }
    ]);

  const riskSurface = (): A2uiSurface =>
    S.genericSurface(tr('Document risks', '文档风险'), [
      {
        title: tr(
          'When the cloud service is not deployed, the client can only show a real failure',
          '云端服务未部署时，客户端只能展示真实失败'
        ),
        subtitle: tr('Impact: first-run experience and demos', '影响：首次体验与演示'),
        meta: tr('High risk · requires a deployment check', '高风险 · 需要独立部署检查')
      },
      {
        title: tr(
          'AGC login, signing and app identity must match',
          'AGC 登录、签名与应用身份必须匹配'
        ),
        subtitle: tr('Impact: a device cannot reach the main screen', '影响：真机无法进入主界面'),
        meta: tr('High risk · documented in the build guide', '高风险 · 已在构建文档中说明')
      },
      {
        title: tr(
          'Write actions lack receipt / eventId validation',
          '写操作缺少 receipt / eventId 校验'
        ),
        subtitle: tr('Impact: cannot prove an action actually completed', '影响：无法证明动作真实完成'),
        meta: tr('Medium risk · needs domain validators', '中风险 · 需要领域 Validator')
      }
    ]);

  const nextStepsSurface = (): A2uiSurface =>
    S.genericSurface(tr('Next-step checklist', '下一步工作清单'), [
      {
        title: tr(
          '1. Freeze the core A2UI component catalog',
          '1. 冻结核心 A2UI 组件目录'
        ),
        subtitle: tr(
          'Start with SurfaceRoot / InfoRows / ActionBar and three business cards',
          '先覆盖 SurfaceRoot / InfoRows / ActionBar / 三类业务卡'
        ),
        meta: tr('This week · design + client', '本周 · 设计 + 客户端')
      },
      {
        title: tr(
          '2. Verify login and notifications on a real device',
          '2. 用真实设备验证登录与通知'
        ),
        subtitle: tr(
          'Cover cold start, backgrounding, account switching and notification routing',
          '覆盖冷启动、切后台、账号切换和通知跳转'
        ),
        meta: tr('This week · device', '本周 · 真机')
      },
      {
        title: tr(
          '3. Make discovery inventory restore a repeatable test',
          '3. 把发现流库存恢复做成可重复的测试'
        ),
        subtitle: tr(
          'Cover force-stop, account switching and schema mismatch',
          '覆盖强制停止、账号切换和 schema 不匹配'
        ),
        meta: tr('Next week · client', '下周 · 客户端')
      }
    ]);

  const draftSurface = (): A2uiSurface =>
    S.genericSurface(tr('Slack reply draft', 'Slack 回复草稿'), [
      {
        title: tr('Draft · local only', '草稿 · 仅本地'),
        subtitle: tr(
          'Got it. I’ll note the contrast issue. I’ll ship another pass on the discovery card colours today, focusing on small text and source tags on light backgrounds.',
          '收到，我先把对比度问题记下来。今天会给发现流卡片再补一版色值，重点看浅色背景上的小字号和来源标签。'
        ),
        meta: tr('Not sent · needs your confirmation', '未发送 · 需要你确认'),
        status: tr('Draft', '草稿')
      }
    ]);

  if (/^hi\b|^hello|^hey\b|good morning|good afternoon|good evening|anyone there|^你好|^您好|在吗|早上好|下午好|晚上好/.test(lower)) {
    return {
      thinking: [tr('Read local context', '读取本地上下文'), tr('Prepare suggestions', '准备建议')],
      text: tr(
        'Hi, I’m the web demo of DigitalMate.\n\nI can help with travel options, nearby places, email summaries, calendars, or the discovery feed.\n\nThis is a **mock-first** demo: the interface and A2UI cards follow the real code structure, while the data is local seed data.',
        '你好，我是 DigitalMate 的网页演示版。\n\n我可以帮你查出行方案、看附近门店、汇总邮件、整理日程，或者浏览发现流。\n\n这是一个 **mock-first** 演示：界面和 A2UI 卡片来自真实代码结构，数据是本地种子数据。'
      ),
      followUps: tr(
        'Find trains from Beijing to Shanghai tomorrow|Find coffee nearby|Show today’s social messages',
        '查明天北京到上海的高铁|附近有什么咖啡店|看看今天的社交消息'
      ).split('|')
    };
  }

  if (/weather|temperature|forecast|rain\b|day after|天气|气温|下雨|后天/.test(lower)) {
    return {
      thinking: [
        tr('Parse city and date', '解析城市与日期'),
        tr('Query Amap Weather', '查询高德天气'),
        tr('Generate a weather summary', '生成天气摘要')
      ],
      text: tr(
        'Tomorrow in Shenzhen: partly cloudy, 26–31°C. There is a 30% chance of a brief afternoon shower, so bring an umbrella.',
        '明天深圳多云间晴，26–31°C。午后有 30% 的短时阵雨概率，建议带伞。'
      ),
      surface: S.weatherSurface(),
      followUps: tr('What about the day after tomorrow?|Find coffee nearby', '后天呢|附近有什么咖啡店').split('|')
    };
  }

  if (/train only|only trains|trains only|只看高铁|只要高铁|高铁方案/.test(lower)) {
    return {
      thinking: [
        tr('Keep train sources', '保留高铁来源'),
        tr('Filter flight candidates', '过滤航班候选'),
        tr('Re-rank results', '重新排序')
      ],
      text: tr(
        'I filtered out flights and kept only the trains returned by 12306.',
        '已过滤掉航班，只保留 12306 返回的高铁车次。'
      ),
      surface: S.trainOnlySurface(),
      followUps: tr('Include flights as well|Move to morning', '把航班也一起列出来|换到上午').split('|')
    };
  }

  if (/move to morning|换到上午/.test(lower) ||
    (/morning|上午|早上/.test(lower) && /train|flight|travel|beijing|shanghai|trip|高铁|车|北京|上海|出行|航班|飞机/.test(lower))) {
    return {
      thinking: [
        tr('Identify the time range', '识别时间范围'),
        tr('Query 12306 and flight sources', '查询 12306 与航班源'),
        tr('Sort by departure time', '按出发时间排序'),
        tr('Generate itinerary cards', '生成行程卡片')
      ],
      text: tr(
        'Here are the morning options: two trains and one flight. Train availability comes from 12306 in real time.',
        '明天上午的候选整理好了：2 趟高铁和 1 个航班。高铁余票以 12306 实时结果为准。'
      ),
      surface: S.morningTravelSurface(),
      followUps: tr('Show only trains|Move to afternoon', '只看高铁|换到下午').split('|')
    };
  }

  if (/openai|public post|public x post|see public x|x post|posts from|公开 post|帖子/.test(lower)) {
    return {
      thinking: [
        tr('Connect to public X search', '连接 X 公开搜索'),
        tr('Filter public content', '过滤公开内容'),
        tr('Preserve sources', '保留来源')
      ],
      text: tr(
        'Here are the three most recent public posts related to OpenAI on X. They never enter SocialHub.',
        '这是 X 上最近与 openai 相关的 3 条公开帖子。它们不会进入 SocialHub。'
      ),
      surface: xPostsSurface(),
      followUps: tr('Show the social hub|Search for more', '看社交聚合|搜索更多').split('|')
    };
  }

  if (/luckin|瑞幸/.test(lower)) {
    return {
      thinking: [
        tr('Locate nearby stores', '定位附近门店'),
        tr('Query the Luckin MCP', '查询瑞幸 MCP'),
        tr('Filter orderable stores', '过滤可下单门店')
      ],
      text: tr(
        'There is a Luckin Coffee 260 m away (Huawei Campus store), currently open. Reference price is ¥16/person; the mini-program has the final price.',
        '附近 260m 有一家瑞幸（华为基地店），营业中。参考价 ¥16/人，实际价格以小程序为准。'
      ),
      surface: luckinOnlySurface(),
      followUps: tr('Find other coffee nearby|Show lunch places', '附近还有什么咖啡|找点吃的').split('|')
    };
  }

  if (/draft|reply|formal|起草回复|回复草稿|再正式一点/.test(lower)) {
    return {
      thinking: [
        tr('Read the selected message', '读取当前选中消息'),
        tr('Generate a draft', '生成草稿'),
        tr('Mark it as unsent', '标记为未发送')
      ],
      text: tr(
        'I drafted a reply and kept it locally. It has not been sent.',
        '我起草了一版回复，只保存在本地，还没有发送。'
      ),
      surface: draftSurface(),
      followUps: tr('Make it more formal|Show the social hub', '再正式一点|看社交聚合').split('|')
    };
  }

  if (/risk|风险/.test(lower)) {
    return {
      thinking: [
        tr('Locate the risk section', '定位风险章节'),
        tr('Sort by impact', '按影响排序'),
        tr('Generate a risk list', '生成风险清单')
      ],
      text: tr(
        'I pulled three risks out of the document and sorted them by impact.',
        '我从文档里单独抽出了 3 项风险，按影响排序。'
      ),
      surface: riskSurface(),
      followUps: tr('Turn into next steps|Show the full summary', '整理下一步|生成完整摘要').split('|')
    };
  }

  if (/next step|next-step|action item|checklist|下一步|工作清单|清单/.test(lower) &&
    !/summar|总结|摘要/.test(lower)) {
    return {
      thinking: [
        tr('Summarise conclusions', '归纳结论'),
        tr('Break down action items', '拆解行动项'),
        tr('Generate a checklist', '生成清单')
      ],
      text: tr(
        'Based on the document, I turned the conclusions into three next actions.',
        '按文档里的结论，我整理了 3 个下一步行动项。'
      ),
      surface: nextStepsSurface(),
      followUps: tr('Risks only|Show the full summary', '只看风险|生成完整摘要').split('|')
    };
  }

  if (/document|requirements|pdf|summar|文档|需求|总结/.test(lower)) {
    return {
      thinking: [
        tr('Parse document structure', '解析文档结构'),
        tr('Extract key questions', '提取关键问题'),
        tr('Summarise risks and next steps', '归纳风险与下一步'),
        tr('Generate a summary card', '生成摘要卡片')
      ],
      text: tr(
        'I finished reading the requirements document and extracted four key questions, three risks and two next steps. The original was never uploaded; parsing happened locally.',
        '我读完了这份需求文档，提取了 4 个关键问题、3 项风险和 2 个下一步。原文没有上传，解析在本地完成。'
      ),
      surface: S.documentSurface(),
      followUps: tr('Turn into next steps|Risks only', '整理下一步|只看风险').split('|')
    };
  }

  if (/train|flight|travel|trip|itinerary|beijing|shanghai|evening|afternoon|高铁|车次|火车|北京|上海|出行|行程|航班|飞机|换到下午/.test(lower)) {
    return {
      thinking: [
        tr('Identify the travel intent', '识别出行意图'),
        tr('Query 12306 and flight sources', '查询 12306 与航班源'),
        tr('Merge and rank candidates', '合并并排序候选'),
        tr('Generate itinerary cards', '生成行程卡片')
      ],
      text: tr(
        'I found two trains and two flights from Beijing to Shanghai tomorrow evening. Train availability comes from 12306 in real time; flight prices vary by fare class.\n\n**Recommendation:** G21 is the more reliable choice if punctuality matters; CA1859 is better if time is tight.',
        '我查到了明天傍晚从北京到上海的 2 趟高铁和 2 个航班。高铁余票以 12306 实时结果为准；航班价格会随舱位变化。\n\n**建议**：如果优先准点，G21 更稳；如果赶时间，CA1859 更合适。'
      ),
      surface: S.travelSurface(),
      followUps: tr(
        'Show only trains|Move to morning|Add the results to my calendar',
        '只看高铁|换到上午|把结果加入日历'
      ).split('|')
    };
  }

  if (/coffee|cafe|food|lunch|dinner|restaurant|nearby|sit|sitting|咖啡|吃|餐厅|门店|附近|午餐|晚饭|久坐/.test(lower)) {
    return {
      thinking: [
        tr('Parse location and taste', '解析位置与口味'),
        tr('Query four local-life sources in parallel', '并行查询 4 个本地生活源'),
        tr('Deduplicate by place name', '按门店名称去重'),
        tr('Generate place cards', '生成门店卡片')
      ],
      text: tr(
        'I found four coffee shops near the Bantian Huawei campus, merged by distance and rating. All sources are healthy; ordering and payment still need to be confirmed on the provider platform.',
        '坂田华为基地附近找到 4 家可去的咖啡店，已按距离和评分合并。来源状态都正常；下单和支付仍需要你在对应平台确认。'
      ),
      surface: S.foodSurface(),
      followUps: tr(
        'Show Luckin only|Find lunch nearby|Which one is good for sitting?',
        '只看瑞幸|找点吃的|哪家适合久坐'
      ).split('|')
    };
  }

  if (/social|message|slack|wecom|twitter|x post|unread|社交|消息|微信|推特/.test(lower)) {
    return {
      thinking: [
        tr('Read authorised connections', '读取已授权连接'),
        tr('Fetch X / Slack / WeCom', '拉取 X / Slack / 企业微信'),
        tr('Filter public and private boundaries', '过滤公开与私密边界'),
        tr('Generate SocialHub', '生成 SocialHub')
      ],
      text: tr(
        'There are three messages worth reading today: an X mention, a Slack thread and a WeCom cache item. They are sorted by unread status and time.',
        '今天有 3 条值得看的消息：一条 X 提及、一条 Slack 线程、一条企业微信缓存。已按未读和时间排序。'
      ),
      surface: S.socialSurface(),
      followUps: tr('Draft a reply|See public X posts|Show unread only', '起草回复|看 X 公开帖|只看未读').split('|')
    };
  }

  if (/mail|email|gmail|inbox|邮箱|邮件/.test(lower)) {
    return {
      thinking: [
        tr('Read Gmail and QQ Mail', '读取 Gmail 与 QQ 邮箱'),
        tr('Sort by importance and time', '按重要性和时间排序'),
        tr('Merge threads', '合并线程')
      ],
      text: tr(
        'I summarised the three most important emails. Outlook is not configured, so it was not included in this aggregation.',
        '邮箱里最近的 3 封重要邮件已汇总。Outlook 未配置，所以这次没有纳入聚合。'
      ),
      surface: S.mailSurface(),
      followUps: tr('Draft a reply|Show unread only', '起草回复|只看未读').split('|')
    };
  }

  if (/calendar|schedule|meeting|event|conflict|日程|日历|会议|冲突/.test(lower)) {
    return {
      thinking: [
        tr('Read the authorised calendar', '读取已授权日历'),
        tr('Sort by time', '按时间排序'),
        tr('Check for conflicts', '检查冲突'),
        tr('Generate schedule cards', '生成日程卡片')
      ],
      text: tr(
        'There are six meetings this week, with one conflict on Thursday afternoon. Below are the next three events.',
        '本周有 6 场会议，周四下午有一处冲突。下面只展示接下来的 3 个日程。'
      ),
      surface: S.calendarSurface(),
      followUps: tr('Create a new event|Show conflicts only', '新建日程|只看冲突').split('|')
    };
  }

  return {
    thinking: [tr('Understand the task', '理解任务'), tr('Assemble local context', '整理本地上下文'), tr('Generate a reply', '生成回复')],
    text: tr(
      'Got it. This is a **mock-first demo**, so I am not connected to a real Orbit service or on-device model yet.\n\nTry one of these tasks to see the full A2UI cards and interactions:\n\n- Find trains from Beijing to Shanghai tomorrow\n- Find coffee nearby\n- Show today’s social messages\n- Summarize a requirements document',
      '收到。当前是 **mock-first 演示模式**，我还没有连接真实的 Orbit 服务或端侧模型。\n\n你可以试试下面的任务，它们会展示完整的 A2UI 卡片和交互：\n\n- 查明天北京到上海的高铁\n- 附近有什么咖啡店\n- 看看今天的社交消息\n- 总结一份需求文档'
    ),
    followUps: tr(
      'Find trains from Beijing to Shanghai tomorrow|Find coffee nearby|Show today’s social messages|Summarize a requirements document',
      '查明天北京到上海的高铁|附近有什么咖啡店|看看今天的社交消息|总结一份需求文档'
    ).split('|')
  };
}
