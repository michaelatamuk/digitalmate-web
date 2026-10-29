import type { A2uiSurface, CalendarEvent } from '../types';
import { makeSurface } from './makeSurface';

export { makeSurface };

export function travelSurface(): A2uiSurface {
  return makeSurface(
    'Travel options',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Beijing → Shanghai', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'options', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: 'Search criteria', dataPath: '/summary' },
      { id: 'options', component: 'TravelOptions', title: 'Tomorrow evening · sorted by departure', dataPath: '/options' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: 'Execution boundary',
        body: 'I can organise options and sources, but I will not book, pay or grab tickets. Purchase on 12306 or the airline site.',
        actions: [
          { id: 'morning', label: 'Move to morning', prompt: 'Find morning trains from Beijing to Shanghai tomorrow', variant: 'secondary' },
          { id: 'train-only', label: 'Trains only', prompt: 'Show only trains from Beijing to Shanghai tomorrow', variant: 'ghost' }
        ]
      }
    ],
    {
      summary: [
        { label: 'From', value: 'Beijing South / Capital Airport' },
        { label: 'To', value: 'Shanghai Hongqiao' },
        { label: 'Date', value: 'Tomorrow · Oct 29' },
        { label: 'Filter', value: 'After 18:00 · available' },
        { label: 'Sources', value: '12306 · VariFlight' }
      ],
      options: [
        {
          kind: 'train',
          code: 'G21',
          from: 'Beijing South',
          to: 'Shanghai Hongqiao',
          depart: '18:00',
          arrive: '22:36',
          duration: '4h 36m',
          price: 'from ¥553',
          seats: 'Second class available',
          sourceTag: 'Train · 12306',
          status: 'success'
        },
        {
          kind: 'train',
          code: 'G23',
          from: 'Beijing South',
          to: 'Shanghai Hongqiao',
          depart: '18:35',
          arrive: '23:12',
          duration: '4h 37m',
          price: 'from ¥553',
          seats: 'Second class · 6 left',
          sourceTag: 'Train · 12306',
          status: 'success'
        },
        {
          kind: 'flight',
          code: 'CA1859',
          from: 'Capital T3',
          to: 'Hongqiao T2',
          depart: '19:10',
          arrive: '21:25',
          duration: '2h 15m',
          price: 'from ¥980',
          seats: 'Economy · 20% off',
          sourceTag: 'Flight · VariFlight',
          status: 'success'
        },
        {
          kind: 'flight',
          code: 'MU5102',
          from: 'Capital T2',
          to: 'Hongqiao T2',
          depart: '19:45',
          arrive: '22:05',
          duration: '2h 20m',
          price: 'from ¥1,040',
          seats: 'Economy · 10% off',
          sourceTag: 'Flight · VariFlight',
          status: 'success'
        }
      ]
    },
    'Trains and flights mixed, sources preserved'
  );
}

export function morningTravelSurface(): A2uiSurface {
  const surface = travelSurface();
  surface.title = 'Morning travel options';
  surface.data.summary = [
    { label: 'From', value: 'Beijing South / Capital Airport' },
    { label: 'To', value: 'Shanghai Hongqiao' },
    { label: 'Date', value: 'Tomorrow · Oct 29' },
    { label: 'Filter', value: '08:00 – 12:00' },
    { label: 'Sources', value: '12306 · VariFlight' }
  ];
  surface.data.options = [
    {
      kind: 'train',
      code: 'G1',
      from: 'Beijing South',
      to: 'Shanghai Hongqiao',
      depart: '09:00',
      arrive: '13:28',
      duration: '4h 28m',
      price: 'from ¥553',
      seats: 'Second class available',
      sourceTag: 'Train · 12306',
      status: 'success'
    },
    {
      kind: 'train',
      code: 'G3',
      from: 'Beijing South',
      to: 'Shanghai Hongqiao',
      depart: '10:00',
      arrive: '14:29',
      duration: '4h 29m',
      price: 'from ¥553',
      seats: 'Second class · 12 left',
      sourceTag: 'Train · 12306',
      status: 'success'
    },
    {
      kind: 'flight',
      code: 'CA1831',
      from: 'Capital T3',
      to: 'Hongqiao T2',
      depart: '10:30',
      arrive: '12:45',
      duration: '2h 15m',
      price: 'from ¥760',
      seats: 'Economy · 30% off',
      sourceTag: 'Flight · VariFlight',
      status: 'success'
    }
  ];
  return surface;
}

export function trainOnlySurface(): A2uiSurface {
  return makeSurface(
    'Train options',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Trains only', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'options', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: 'Search criteria', dataPath: '/summary' },
      { id: 'options', component: 'TrainOptions', title: 'Tomorrow · Beijing South → Shanghai Hongqiao', dataPath: '/trains' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: 'Ticket notes',
        body: 'Schedules and availability come from 12306. Open any train in the app to continue on the 12306 website.',
        actions: [{ id: 'all', label: 'Add flights', prompt: 'Include flights as well', variant: 'secondary' }]
      }
    ],
    {
      summary: [
        { label: 'From', value: 'Beijing South' },
        { label: 'To', value: 'Shanghai Hongqiao' },
        { label: 'Date', value: 'Tomorrow · Oct 29' },
        { label: 'Filter', value: 'After 18:00' }
      ],
      trains: [
        {
          trainCode: 'G21',
          from: 'Beijing South',
          to: 'Shanghai Hongqiao',
          depart: '18:00',
          arrive: '22:36',
          duration: '4h 36m',
          seats: 'Second class available',
          price: 'from ¥553',
          sourceTag: 'Train · 12306'
        },
        {
          trainCode: 'G23',
          from: 'Beijing South',
          to: 'Shanghai Hongqiao',
          depart: '18:35',
          arrive: '23:12',
          duration: '4h 37m',
          seats: 'Second class · 6 left',
          price: 'from ¥553',
          sourceTag: 'Train · 12306'
        },
        {
          trainCode: 'G25',
          from: 'Beijing South',
          to: 'Shanghai Hongqiao',
          depart: '19:00',
          arrive: '23:38',
          duration: '4h 38m',
          seats: 'First class · 3 left',
          price: 'from ¥933',
          sourceTag: 'Train · 12306'
        }
      ]
    },
    'Only verifiable 12306 results'
  );
}

export function foodSurface(): A2uiSurface {
  return makeSurface(
    'Coffee nearby',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Shenzhen · Bantian Huawei Campus', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'foods', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: 'Aggregation criteria', dataPath: '/summary' },
      { id: 'foods', component: 'FoodChoices', title: 'Merged by distance and rating', dataPath: '/foods' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: 'Search only, no ordering',
        body: 'Places, opening status and reference prices come from local-life providers. Ordering, coupons and payment must be confirmed on the provider platform.',
        actions: [
          { id: 'luckin', label: 'Luckin only', prompt: 'Show Luckin Coffee nearby', variant: 'secondary' },
          { id: 'meal', label: 'Find lunch', prompt: 'Find lunch places nearby', variant: 'ghost' }
        ]
      }
    ],
    {
      summary: [
        { label: 'Location', value: 'Bantian Huawei Campus · 1.5 km' },
        { label: 'Keywords', value: 'Coffee · good for sitting' },
        { label: 'Aggregated', value: 'Amap · Meituan · Luckin' },
        { label: 'Source status', value: '3 healthy / 0 failed' }
      ],
      foods: [
        {
          name: '% Arabica (MixC World)',
          category: 'Coffee · Light bites',
          distance: '480 m',
          address: '9668 Shennan Blvd, Nanshan',
          rating: '4.8',
          price: '¥32/person',
          open: 'Open',
          sourceTags: ['Amap', 'Meituan']
        },
        {
          name: 'Manner Coffee (Bantian Vanke)',
          category: 'Coffee · Bakery',
          distance: '720 m',
          address: 'Vanke City, Bantian, Longgang',
          rating: '4.7',
          price: '¥22/person',
          open: 'Open',
          sourceTags: ['Amap', 'Tencent Maps']
        },
        {
          name: 'Seesaw Coffee (Tian’an Cloud Park)',
          category: 'Specialty coffee',
          distance: '1.1 km',
          address: 'Tian’an Cloud Park, Longgang',
          rating: '4.6',
          price: '¥38/person',
          open: 'Open',
          sourceTags: ['Amap', 'Meituan']
        },
        {
          name: 'Luckin Coffee (Huawei Campus)',
          category: 'Coffee · Grab & go',
          distance: '260 m',
          address: 'Huawei Campus Rd 1, Longgang',
          rating: '4.5',
          price: '¥16/person',
          open: 'Open',
          sourceTags: ['Luckin MCP', 'Amap']
        }
      ]
    },
    '4 sources returned, deduplicated by place name'
  );
}

export function socialSurface(): A2uiSurface {
  return makeSurface(
    'Social hub',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Today · SocialHub', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'social', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: 'Connection status', dataPath: '/summary' },
      { id: 'social', component: 'SocialHub', title: 'Unread and mentions', dataPath: '/items' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: 'Replies need confirmation',
        body: 'This view only shows messages, mentions and connection status from authorised accounts. Public posts never enter SocialHub; drafts are confirmed before sending.',
        actions: [
          { id: 'draft', label: 'Draft a reply', prompt: 'Draft a reply to the Slack message', variant: 'secondary' },
          { id: 'x', label: 'See public X posts', prompt: 'Show recent public posts from openai on X', variant: 'ghost' }
        ]
      }
    ],
    {
      summary: [
        { label: 'X', value: 'Connected · 2 unread', tone: 'success' },
        { label: 'Slack', value: 'Connected · 1 mention', tone: 'success' },
        { label: 'WeCom', value: 'Local callback cache', tone: 'muted' }
      ],
      items: [
        {
          author: 'Lin Wei',
          handle: '@linwei',
          channel: 'X',
          text: 'The DigitalMate A2UI approach is interesting: the model emits declarative components and the client owns rendering.',
          time: '09:42',
          unread: true
        },
        {
          author: 'Design Systems',
          handle: '#dm-design',
          channel: 'Slack',
          text: 'The new warm-white theme is merged. The discovery card contrast still needs another pass.',
          time: '09:18',
          unread: true
        },
        {
          author: 'Project group',
          handle: 'WeCom',
          text: 'Device regression this Friday. Focus on login, background tasks and notification routing.',
          time: 'Yesterday',
          unread: false
        }
      ]
    },
    '3 connections · unread sorted by time'
  );
}

export function mailSurface(): A2uiSurface {
  return makeSurface(
    'Inbox summary',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Important mail', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'results', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: 'Aggregation result', dataPath: '/summary' },
      { id: 'results', component: 'GenericToolResults', title: 'Latest 3', dataPath: '/results' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: 'Drafts are not sent',
        body: 'I can create a draft from a real thread, but I will never send it automatically. Gmail sending is a manual-only path.',
        actions: [{ id: 'draft', label: 'Draft a reply', prompt: 'Draft a reply to the most recent email', variant: 'secondary' }]
      }
    ],
    {
      summary: [
        { label: 'Gmail', value: '2 important', tone: 'success' },
        { label: 'QQ Mail', value: '1 important', tone: 'success' },
        { label: 'Outlook', value: 'Not configured', tone: 'muted' }
      ],
      results: [
        {
          title: 'Q4 roadmap review — action items',
          subtitle: 'Alice Chen · Product',
          meta: 'Today 08:54 · Gmail',
          status: 'Unread'
        },
        {
          title: 'Test environment certificate renewal',
          subtitle: 'Operations notice',
          meta: 'Yesterday 19:20 · QQ Mail',
          status: ''
        },
        {
          title: 'Your invoice is ready',
          subtitle: 'Billing',
          meta: 'Yesterday 11:02 · Gmail',
          status: ''
        }
      ]
    },
    'Gmail and QQ Mail merged, newest first'
  );
}

export function calendarSurface(extraEvents: CalendarEvent[] = []): A2uiSurface {
  return makeSurface(
    'This week',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Google Calendar', status: 'ready' },
      { id: 'body', component: 'Column', children: ['metrics', 'schedule', 'boundary'] },
      { id: 'metrics', component: 'MetricGrid', title: 'Week overview', dataPath: '/metrics' },
      { id: 'schedule', component: 'ScheduleStack', title: 'Up next', dataPath: '/schedule' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: 'Writes need confirmation',
        body: 'Creating, editing and deleting events always shows a confirmation card bound to a real eventId.',
        actions: [{ id: 'create', label: 'New event', prompt: 'Create a 30-minute review event tomorrow at 3 PM', variant: 'secondary' }]
      }
    ],
    {
      metrics: [
        { label: 'Meetings', value: '6', tone: 'accent' },
        { label: 'Focus time', value: '4.5h', tone: 'success' },
        { label: 'Conflicts', value: '1', tone: 'warning' },
        { label: 'Pending', value: '2', tone: 'muted' }
      ],
      schedule: [
        { time: '10:00', title: 'Design review · A2UI cards', meta: 'Meeting room 3A · 45 min', tone: 'accent' },
        { time: '14:00', title: 'Device regression · login and notifications', meta: 'Online · 60 min', tone: 'train' },
        { time: '16:30', title: 'Discovery ranking experiment review', meta: 'With Data · 30 min', tone: 'flight' },
        ...extraEvents
      ]
    },
    'From authorised Google Calendar'
  );
}

export function documentSurface(): A2uiSurface {
  return makeSurface(
    'Document summary',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'requirements-v3.pdf', status: 'ready' },
      { id: 'body', component: 'Column', children: ['metrics', 'summary', 'actions'] },
      { id: 'metrics', component: 'MetricGrid', title: 'Reading result', dataPath: '/metrics' },
      {
        id: 'summary',
        component: 'Text',
        text:
          '**Key takeaways**\n\n1. The home page must support both cloud tasks and on-device capabilities, but their tool catalogues must be configured separately.\n2. Discovery inventory, deduplication and ranking must be isolated per account and restored after a restart.\n3. Every external write must be confirmed; payments, sends, orders and deletions must never retry automatically.\n\n**Main risks**\n\n- When the cloud service is not deployed, the client can only show a real failure, never fabricate a result.\n- AGC login, signing and app identity must match, otherwise a device cannot reach the main screen.'
      },
      {
        id: 'actions',
        component: 'ActionBar',
        actions: [
          { id: 'plan', label: 'Turn into next steps', prompt: 'Turn this document into a next-step checklist', variant: 'primary' },
          { id: 'risk', label: 'Risks only', prompt: 'List only the risks in this document', variant: 'ghost' }
        ]
      }
    ],
    {
      metrics: [
        { label: 'Pages', value: '12', tone: 'accent' },
        { label: 'Key questions', value: '4', tone: 'muted' },
        { label: 'Risks', value: '3', tone: 'warning' },
        { label: 'Next steps', value: '2', tone: 'success' }
      ]
    },
    'Parsed locally · original never uploaded'
  );
}

export function hotelSurface(): A2uiSurface {
  return makeSurface(
    'Hotel options',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Shenzhen · Nanshan', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'hotels', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: 'Stay criteria', dataPath: '/summary' },
      { id: 'hotels', component: 'HotelOptions', title: 'Tomorrow · 2 nights', dataPath: '/hotels' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: 'Nothing is booked',
        body: 'I can compare rooms and sources, but a reservation and payment must be completed on the provider site. Room prices change frequently.',
        actions: [
          { id: 'hotel-cheaper', label: 'Show cheaper stays', prompt: 'Show cheaper hotels in Shenzhen Nanshan', variant: 'secondary' },
          { id: 'hotel-refundable', label: 'Free cancellation only', prompt: 'Show hotels with free cancellation in Shenzhen', variant: 'ghost' }
        ]
      }
    ],
    {
      summary: [
        { label: 'Check-in', value: 'Tomorrow · Oct 30' },
        { label: 'Nights', value: '2' },
        { label: 'Guests', value: '1 adult · 1 room' },
        { label: 'Filter', value: '4.5+ · free cancellation' },
        { label: 'Sources', value: 'Trip.com · Booking' }
      ],
      hotels: [
        {
          name: 'Shenzhen Bay Marriott',
          area: 'Nanshan · 1.2 km',
          rating: '4.7',
          price: '¥1,180 / night',
          distance: '12 min walk',
          tags: ['Free cancellation', 'Breakfast included'],
          sourceTag: 'Trip.com'
        },
        {
          name: 'Atour Hotel Shenzhen Bay',
          area: 'Nanshan · 2.4 km',
          rating: '4.6',
          price: '¥620 / night',
          distance: '8 min drive',
          tags: ['Free cancellation', 'Gym'],
          sourceTag: 'Booking'
        },
        {
          name: 'Hyatt Place Shenzhen Dongmen',
          area: 'Luohu · 9.8 km',
          rating: '4.5',
          price: '¥780 / night',
          distance: '25 min drive',
          tags: ['Breakfast included', 'Late checkout'],
          sourceTag: 'Trip.com'
        }
      ]
    },
    'Local demo · no reservation or payment'
  );
}

export function rideSurface(): A2uiSurface {
  return makeSurface(
    'Ride options',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'To Shenzhen Bao’an Airport', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'rides', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: 'Trip details', dataPath: '/summary' },
      { id: 'rides', component: 'RideOptions', title: 'Pickup tomorrow 17:30', dataPath: '/rides' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: 'Booking stays with the provider',
        body: 'Fares are estimates from the provider API. I do not place the ride or charge a payment method.',
        actions: [
          { id: 'ride-later', label: 'Leave 30 min later', prompt: 'Show rides to the airport leaving 30 minutes later', variant: 'secondary' },
          { id: 'ride-pool', label: 'Show shared rides', prompt: 'Show shared rides to Shenzhen airport', variant: 'ghost' }
        ]
      }
    ],
    {
      summary: [
        { label: 'From', value: 'Bantian Huawei Campus' },
        { label: 'To', value: 'Shenzhen Bao’an Airport' },
        { label: 'Pickup', value: 'Tomorrow · 17:30' },
        { label: 'Ride', value: '1 passenger · 2 bags' },
        { label: 'Traffic', value: 'Light · 42 min estimated' }
      ],
      rides: [
        { provider: 'DiDi Express', car: 'Economy', eta: '3 min away', price: '¥86–102', distance: '42 min · 38 km', sourceTag: 'DiDi' },
        { provider: 'DiDi Premier', car: 'Comfort', eta: '5 min away', price: '¥128–150', distance: '41 min · 38 km', sourceTag: 'DiDi' },
        { provider: 'Taxi', car: 'Metered', eta: '8 min away', price: '≈ ¥110', distance: '44 min · 39 km', sourceTag: 'Local taxi' }
      ]
    },
    'Local demo · no ride is placed'
  );
}

export function paymentSurface(): A2uiSurface {
  return makeSurface(
    'Payment check',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Order review', status: 'ready' },
      { id: 'body', component: 'Column', children: ['summary', 'payment', 'boundary'] },
      { id: 'summary', component: 'InfoRows', title: 'Order summary', dataPath: '/summary' },
      { id: 'payment', component: 'PaymentCard', dataPath: '/payment' },
      {
        id: 'boundary',
        component: 'ConfirmPanel',
        title: 'Payment not submitted',
        body: 'This is a payment review card from demo data. A real client requires an explicit confirmation bound to a provider orderId.',
        actions: [
          { id: 'payment-cancel', label: 'Cancel order', prompt: 'Cancel the demo order', variant: 'ghost' },
          { id: 'payment-method', label: 'Change payment method', prompt: 'Change the payment method for this order', variant: 'secondary' }
        ]
      }
    ],
    {
      summary: [
        { label: 'Merchant', value: 'Luckin Coffee · Huawei Campus' },
        { label: 'Order', value: '2 items · pickup 15:10' },
        { label: 'Subtotal', value: '¥32.00' },
        { label: 'Discount', value: '− ¥6.00' },
        { label: 'Total', value: '¥26.00' }
      ],
      payment: {
        title: 'Confirm payment',
        merchant: 'Luckin Coffee',
        amount: '¥26.00',
        method: 'Wallet · balance ¥120.00',
        status: 'Awaiting confirmation',
        note: 'Nothing is charged until you confirm on the provider page.'
      }
    },
    'Local demo · no charge is made'
  );
}

export function mediaSurface(): A2uiSurface {
  return makeSurface(
    'Media highlights',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Today’s media', status: 'ready' },
      { id: 'body', component: 'Column', children: ['tabs', 'media', 'note'] },
      { id: 'tabs', component: 'SceneTabs', dataPath: '/tabs' },
      { id: 'media', component: 'MediaSlider', title: 'Picked for your commute', dataPath: '/media' },
      {
        id: 'note',
        component: 'Text',
        text: 'Media items are demo fixtures. The real client streams authorised podcasts and videos and keeps playback state locally.'
      }
    ],
    {
      tabs: [{ label: 'For you' }, { label: 'Podcasts' }, { label: 'Short video' }, { label: 'Saved' }],
      media: [
        { kind: 'Podcast', title: 'Designing agent interfaces that fail safely', meta: '32 min · Tech Weekly' },
        { kind: 'Video', title: 'A2UI in five minutes', meta: '5 min · DigitalMate' },
        { kind: 'Podcast', title: 'Shipping local-first apps', meta: '48 min · Offline Club' },
        { kind: 'Video', title: 'Shenzhen commute in 4K', meta: '3 min · City Notes' }
      ]
    },
    'Local demo · no media streams'
  );
}

export function insightsSurface(): A2uiSurface {
  return makeSurface(
    'Weekly insights',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Your week · Oct 20–26', status: 'ready' },
      { id: 'body', component: 'Column', children: ['metrics', 'mix', 'activity', 'focus', 'note'] },
      { id: 'metrics', component: 'MetricGrid', title: 'Week overview', dataPath: '/metrics' },
      { id: 'mix', component: 'SegmentedRingChart', title: 'Task mix', dataPath: '/taskMix' },
      { id: 'activity', component: 'MultiSeriesLineChart', title: 'Active minutes', dataPath: '/activity' },
      { id: 'focus', component: 'MatrixHeatmap', title: 'Focus by hour', dataPath: '/focus' },
      {
        id: 'note',
        component: 'Text',
        text: 'These numbers come from demo activity only. The real client would compute them from task receipts and keep the raw events locally.'
      }
    ],
    {
      metrics: [
        { label: 'Active days', value: '6', tone: 'accent' },
        { label: 'Tasks', value: '42', tone: 'train' },
        { label: 'Focus time', value: '11h 20m', tone: 'success' },
        { label: 'Completion', value: '86%', tone: 'flight' }
      ],
      taskMix: [
        { label: 'Research', value: 18, percent: 43, tone: 'accent' },
        { label: 'Travel planning', value: 12, percent: 29, tone: 'train' },
        { label: 'Calendar', value: 7, percent: 17, tone: 'flight' },
        { label: 'Other', value: 5, percent: 11, tone: 'muted' }
      ],
      activity: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [
          { name: 'Focus', tone: 'accent', points: [45, 70, 55, 90, 65, 30, 25] },
          { name: 'Idle', tone: 'muted', points: [20, 25, 15, 30, 20, 40, 50] }
        ]
      },
      focus: {
        cols: ['9', '11', '13', '15', '17', '19'],
        rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        values: [
          [1, 2, 3, 2, 1, 0],
          [2, 3, 4, 3, 2, 1],
          [1, 2, 4, 3, 2, 0],
          [3, 4, 3, 4, 2, 1],
          [2, 3, 2, 3, 4, 2]
        ]
      }
    },
    'Local demo · activity receipts are simulated'
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
    'Local demo data'
  );
}

export function weatherSurface(): A2uiSurface {
  return makeSurface(
    'Weather',
    [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Shenzhen · Tomorrow', status: 'ready' },
      { id: 'body', component: 'Column', children: ['metrics', 'summary'] },
      { id: 'metrics', component: 'MetricGrid', dataPath: '/metrics' },
      {
        id: 'summary',
        component: 'Text',
        text:
          'Tomorrow in Shenzhen: partly cloudy, 26–31°C, south-east wind force 2. There is a 30% chance of a brief afternoon shower, so bring an umbrella.\n\nSource: Amap Weather · updated 09:20'
      }
    ],
    {
      metrics: [
        { label: 'High', value: '31°C', tone: 'warning' },
        { label: 'Low', value: '26°C', tone: 'flight' },
        { label: 'Rain', value: '30%', tone: 'accent' },
        { label: 'Air quality', value: 'Good', tone: 'success' }
      ]
    },
    'Amap Weather'
  );
}
