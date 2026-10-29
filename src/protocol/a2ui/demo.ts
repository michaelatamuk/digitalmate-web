import type { A2uiSurface, Language } from '../../types';
import { A2uiSurfaceStore } from './store';

function localized(lang: Language, english: string, chinese: string): string {
  return lang === 'zh' ? chinese : english;
}

export function protocolDemoSurface(lang: Language): A2uiSurface | undefined {
  const title = localized(lang, 'A2UI protocol demo', 'A2UI 协议演示');
  const root = {
    id: 'root',
    component: 'SurfaceRoot',
    child: 'body',
    title,
    status: 'ready'
  };
  const body = {
    id: 'body',
    component: 'Column',
    children: ['hero', 'intro', 'flights', 'list', 'tools', 'expand', 'thinking', 'receiving', 'skeleton']
  };
  const hero = {
    id: 'hero',
    component: 'HeroBanner',
    title: localized(lang, 'Declarative surfaces', '声明式界面'),
    body: localized(
      lang,
      'This surface was created from JSONL envelopes: createSurface → updateComponents → updateDataModel.',
      '这个 surface 由 JSONL 信封创建：createSurface → updateComponents → updateDataModel。'
    ),
    actions: [
      {
        id: 'protocol.close',
        label: localized(lang, 'Looks good', '知道了'),
        variant: 'secondary'
      }
    ]
  };
  const intro = {
    id: 'intro',
    component: 'Text',
    text: localized(
      lang,
      'The renderer is unchanged. A small protocol store parses each line and feeds the same A2UI component catalog used by the chat cards.',
      '渲染器没有变化。一个小型协议存储逐行解析，并复用聊天卡片使用的同一套 A2UI 组件目录。'
    )
  };
  const flights = {
    id: 'flights',
    component: 'FlightBoard',
    title: localized(lang, 'Flight board component', '航班看板组件'),
    dataPath: '/flights'
  };
  const list = {
    id: 'list',
    component: 'List',
    title: localized(lang, 'List component', '列表组件'),
    dataPath: '/items'
  };
  const tools = {
    id: 'tools',
    component: 'ToolConnectCard',
    title: localized(lang, 'Tool connection', '工具连接'),
    body: localized(lang, 'A custom MCP service would appear here with its connection state.', '自定义 MCP 服务会显示在这里，并带有连接状态。'),
    status: localized(lang, 'Connected', '已连接'),
    actions: [
      { id: 'protocol.retry', label: localized(lang, 'Check again', '重新检查'), variant: 'secondary' }
    ]
  };
  const expand = {
    id: 'expand',
    component: 'ExpandableCard',
    title: localized(lang, 'Expandable details', '可展开详情'),
    body: localized(lang, 'Rows can be folded away when the user needs the summary.', '用户需要摘要时可以收起详细行。'),
    dataPath: '/expandedRows'
  };
  const skeleton = {
    id: 'skeleton',
    component: 'SkeletonCard',
    title: localized(lang, 'Loading state', '加载状态')
  };
  const thinking = {
    id: 'thinking',
    component: 'ThinkingCard',
    title: localized(lang, 'Thinking component', '思考卡片组件'),
    dataPath: '/thinking'
  };
  const receiving = {
    id: 'receiving',
    component: 'StripeReceivingAccountCard',
    title: localized(lang, 'Receiving account', '收款账户'),
    dataPath: '/receiving'
  };

  const lines = [
    { version: 'v0.9.1', createSurface: { surfaceId: 'surface_protocol', root: 'root', title, subtitle: localized(lang, 'Parsed from newline-delimited JSON', '从换行分隔的 JSON 解析') } },
    { version: 'v0.9.1', updateComponents: { surfaceId: 'surface_protocol', components: [root, body, hero, intro, flights, list, tools, expand, thinking, receiving, skeleton] } },
    {
      version: 'v0.9.1',
      updateDataModel: {
        surfaceId: 'surface_protocol',
        path: '/flights',
        value: [
          { code: 'CA1859', from: 'PEK', to: 'SHA', depart: '19:10', arrive: '21:25', status: 'On time', gate: 'T3', sourceTag: 'VariFlight' },
          { code: 'MU5102', from: 'PEK', to: 'SHA', depart: '19:45', arrive: '22:05', status: 'Delayed 10m', gate: 'T2', sourceTag: 'VariFlight' }
        ]
      }
    },
    {
      version: 'v0.9.1',
      updateDataModel: {
        surfaceId: 'surface_protocol',
        path: '/items',
        value: [
          { title: localized(lang, 'Surface store', 'Surface 存储'), subtitle: localized(lang, 'Immutable component and data updates', '不可变组件与数据更新'), meta: 'v0.9.1' },
          { title: localized(lang, 'Catalog boundary', '组件目录边界'), subtitle: localized(lang, 'Unknown components are rejected by the renderer', '未知组件会被渲染器拒绝'), meta: localized(lang, 'safe', '安全') }
        ]
      }
    },
    {
      version: 'v0.9.1',
      updateDataModel: {
        surfaceId: 'surface_protocol',
        path: '/expandedRows',
        value: [
          { label: localized(lang, 'Transport', '传输'), value: 'WebSocket' },
          { label: localized(lang, 'Payload', '载荷'), value: 'JSONL' },
          { label: localized(lang, 'Store', '存储'), value: 'A2uiSurfaceStore' }
        ]
      }
    },
    {
      version: 'v0.9.1',
      updateDataModel: {
        surfaceId: 'surface_protocol',
        path: '/thinking',
        value: {
          title: localized(lang, 'Protocol store applied 3 envelopes', '协议存储已应用 3 个信封'),
          done: true,
          steps: [
            { label: 'createSurface', status: 'done' },
            { label: 'updateComponents', status: 'done' },
            { label: 'updateDataModel', status: 'done' }
          ]
        }
      }
    },
    {
      version: 'v0.9.1',
      updateDataModel: {
        surfaceId: 'surface_protocol',
        path: '/receiving',
        value: {
          provider: 'Stripe (demo)',
          maskedAccount: '•••• 4242',
          status: localized(lang, 'Not connected', '未连接'),
          schedule: localized(lang, '2-day rolling', '2 天滚动'),
          currency: 'USD',
          balance: '$0.00',
          note: localized(
            lang,
            'Demo card only. No account, payout or payment is connected.',
            '仅演示卡片。未连接账号、结算或支付。'
          )
        }
      }
    }
  ];

  const store = A2uiSurfaceStore.fromJsonl(lines.map(line => JSON.stringify(line)).join('\n'));
  return store.get('surface_protocol');
}
