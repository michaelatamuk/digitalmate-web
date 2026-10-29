import type { FeedCard, MemoryProfile, Skill } from '../types';

export const discoverySources = [
  { id: 'all', label: 'All' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'bilibili', label: 'Bilibili' },
  { id: 'x', label: 'X' },
  { id: 'hackernews', label: 'Hacker News' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'zhihu', label: 'Zhihu' },
  { id: 'applepodcasts', label: 'Podcasts' },
  { id: 'github', label: 'GitHub' },
  { id: 'steam', label: 'Steam' },
  { id: 'news', label: 'News' },
  { id: 'rss', label: 'RSS' }
];

export const topicOptions = ['AI & Tech', 'Robotics', 'Open Source', 'HarmonyOS', 'Product Design', 'City Life'];

export const seedCards: FeedCard[] = [
  {
    id: 'fc-1',
    source: 'youtube',
    sourceLabel: 'YouTube',
    topic: 'AI & Tech',
    title: 'Building agents that actually use tools',
    summary:
      'A practical walkthrough of tool selection, approval boundaries and structured UI for personal agents. The last ten minutes cover failure cases.',
    glyph: '▶',
    cover: 'linear-gradient(135deg, #f3c7b8 0%, #e9a18d 42%, #c96f63 100%)',
    readingTime: '28:14',
    published: '2h ago',
    url: 'https://www.youtube.com/',
    body: [
      'The talk starts with a simple question: why do most agent demos stop at text? The speaker argues that a tool result is not the end of the interaction — it is a new surface that the user has to read, compare and act on.',
      'Three patterns are compared: dumping raw JSON, generating free-form HTML, and a constrained component catalog. The catalog wins on consistency and safety, but only if the catalog is small enough to reason about.',
      'The final section covers approval boundaries. Writes, sends, payments and deletions need a visible, single-use confirmation; reads can stream without blocking.'
    ],
    tags: ['Agent', 'Tool use', 'A2UI'],
    metric: '12.4k views'
  },
  {
    id: 'fc-2',
    source: 'bilibili',
    sourceLabel: 'Bilibili',
    topic: 'HarmonyOS',
    title: 'HarmonyOS ArkTS state management in practice',
    summary:
      'Three real screens break down ArkUI update boundaries, with a focus on large objects, list refreshes and Worker messages.',
    glyph: '◐',
    cover: 'linear-gradient(135deg, #f7d3e3 0%, #efaecb 50%, #d77ca7 100%)',
    readingTime: '18:32',
    published: 'Yesterday',
    url: 'https://www.bilibili.com/',
    body: [
      'The video starts with a message list and gradually splits state into page state, conversation state and persisted state. The author warns against putting everything into a single @State, because any update then re-renders the whole tree.',
      'The second case is about Workers. Keep only the minimal display snapshot on the main thread; move heavy computation and file writes into a Worker. Message protocols need a version number, otherwise old messages fail silently after an upgrade.',
      'It ends with a checklist: serialisable, replayable, cancellable, isolated.'
    ],
    tags: ['HarmonyOS', 'ArkTS', 'State management'],
    metric: '38k plays'
  },
  {
    id: 'fc-3',
    source: 'x',
    sourceLabel: 'X',
    topic: 'AI & Tech',
    title: 'A2UI: declarative UI for agents',
    summary:
      'A thread on why agent output should be a component tree plus a data model, not a screenshot or a wall of Markdown.',
    glyph: '𝕏',
    cover: 'linear-gradient(135deg, #d9d4cc 0%, #a9a39b 45%, #5f5a54 100%)',
    readingTime: '6 min read',
    published: '3h ago',
    url: 'https://x.com/',
    body: [
      'The thread makes a sharp distinction between content and controls. Markdown is good for content; it is bad for controls. Once an agent needs the user to choose a train, approve a payment or edit a draft, a text blob stops being enough.',
      'A2UI keeps the model declarative: create a surface, describe a component tree, bind it to a data model. The client owns rendering, accessibility and platform behaviour.',
      'The strongest reply in the thread: “The hard part is not the protocol. It is deciding which components you refuse to add.”'
    ],
    tags: ['A2UI', 'Agent', 'Protocol'],
    metric: '2.1k likes'
  },
  {
    id: 'fc-4',
    source: 'hackernews',
    sourceLabel: 'Hacker News',
    topic: 'Open Source',
    title: 'Show HN: A local-first memory layer for personal agents',
    summary:
      'An open-source project that keeps embeddings and retrieval on-device, with an optional cloud embedding endpoint. 312 points and a lively comment section.',
    glyph: 'Y',
    cover: 'linear-gradient(135deg, #ffd9b0 0%, #ffb26b 48%, #e07a2f 100%)',
    readingTime: '8 min read',
    published: '5h ago',
    url: 'https://news.ycombinator.com/',
    body: [
      'The author argues that personal memory is too sensitive to ship to a remote vector database by default. The project stores facts and vectors locally, and only sends text to an embedding API when the user explicitly enables cloud embeddings.',
      'Commenters push back on two points: schema migration and multi-device sync. The author admits both are unsolved and says the current design optimises for a single phone.',
      'A useful pattern from the thread: separate the memory write path from the recall path, and make recall degrade to an empty result rather than a fabricated one.'
    ],
    tags: ['Memory', 'Local-first', 'Open source'],
    metric: '312 points · 96 comments'
  },
  {
    id: 'fc-5',
    source: 'reddit',
    sourceLabel: 'Reddit',
    topic: 'AI & Tech',
    title: 'What actually works for on-device agents in 2026?',
    summary:
      'r/LocalLLaMA discusses model size, quantisation and the unglamorous parts: permissions, battery and background limits.',
    glyph: '◉',
    cover: 'linear-gradient(135deg, #ffd2c2 0%, #ff9f80 50%, #e05a3c 100%)',
    readingTime: '11 min read',
    published: 'Yesterday',
    url: 'https://www.reddit.com/r/LocalLLaMA/',
    body: [
      'The top comment is blunt: the model is rarely the bottleneck. Permissions, background execution and tool reliability dominate the user experience.',
      'Several people share battery measurements. A 3B model running continuously is still expensive; scheduling work in short, cancellable windows works better than a persistent agent loop.',
      'The thread ends with a useful rule: if a task can be completed with a deterministic template, do not call a model.'
    ],
    tags: ['On-device', 'LLM', 'Battery'],
    metric: '1.4k upvotes'
  },
  {
    id: 'fc-6',
    source: 'zhihu',
    sourceLabel: 'Zhihu',
    topic: 'Product Design',
    title: 'Why on-device agents need structured UI, not longer chat logs',
    summary:
      'A look at the limits of chat interfaces in real tasks, from “comparable results” and “confirmable actions”.',
    glyph: 'Z',
    cover: 'linear-gradient(135deg, #cfe3ff 0%, #9cc5f7 50%, #4f8bd8 100%)',
    readingTime: '9 min read',
    published: '2d ago',
    url: 'https://www.zhihu.com/',
    body: [
      'The article argues that chat logs are good for intent and explanation, but bad for options that need comparison. Trains, flights, places and emails all have stable fields; repeating them in prose only adds reading cost.',
      'Actions matter more. A “confirm payment” button must bind to the current transaction, not ask the user to type “confirm” again. A structured surface can bind an action to real data IDs.',
      'The author also warns that structured does not mean complex. The larger the component catalog, the more likely the model picks the wrong one. Polishing 8–10 core components beats shipping 50.'
    ],
    tags: ['A2UI', 'Interaction design', 'Agent'],
    metric: '684 upvotes'
  },
  {
    id: 'fc-7',
    source: 'applepodcasts',
    sourceLabel: 'Podcasts',
    topic: 'AI & Tech',
    title: 'The future of personal agents',
    summary:
      'A 42-minute conversation about trust, memory and why the best agent may be the one that knows when to stop.',
    glyph: '◍',
    cover: 'linear-gradient(135deg, #e5d4ff 0%, #c9a7f5 50%, #9268d6 100%)',
    readingTime: '42 min',
    published: 'Yesterday',
    url: 'https://podcasts.apple.com/',
    body: [
      'The host asks what a personal agent should remember. The guest separates episodic memory (what happened) from semantic memory (what is true about you) and procedural memory (how you like things done).',
      'Most products collapse all three into a single “memory” list, which makes correction hard. The guest recommends showing users the claim, its evidence and the last time it was used.',
      'On trust: “An agent that says I don’t know is more useful than one that guesses, because it keeps the user in the loop.”'
    ],
    tags: ['Podcast', 'Memory', 'Trust'],
    metric: 'Podcast · 12k subscribers'
  },
  {
    id: 'fc-8',
    source: 'github',
    sourceLabel: 'GitHub',
    topic: 'Open Source',
    title: 'openJiuwen / DigitalMate — HarmonyOS agent client',
    summary:
      'A HarmonyOS multi-module agent app with A2UI surfaces, cloud conversations and a local discovery pipeline. Trending in the HarmonyOS topic this week.',
    glyph: '◈',
    cover: 'linear-gradient(135deg, #e2e4e8 0%, #b8bdc6 50%, #717884 100%)',
    readingTime: '6 min read',
    published: 'This week',
    url: 'https://github.com/openJiuwen-ai/DigitalMate',
    body: [
      'The repository is organised around an entry HAP, an agent core HAR and a cloud adapter HAR. The most interesting part is the separation between cloud tasks and on-device aggregation.',
      'The A2UI directory defines a small component catalog and a streaming JSONL protocol. Tool outputs are expected to be surfaces, not opaque text.',
      'The discovery feed keeps a local inventory with deduplication, ranking and account-scoped persistence. It is a useful reference for anyone building a content feed on a phone.'
    ],
    tags: ['HarmonyOS', 'Agent', 'Open source'],
    metric: '★ 4.2k'
  },
  {
    id: 'fc-9',
    source: 'steam',
    sourceLabel: 'Steam',
    topic: 'City Life',
    title: 'Steam Next Fest: five demos worth your time',
    summary:
      'A short list of small-team demos with strong art direction, from a cosy management sim to a tactical deckbuilder.',
    glyph: '◒',
    cover: 'linear-gradient(135deg, #c9d7ee 0%, #8fa8cf 50%, #3f5a86 100%)',
    readingTime: '7 min read',
    published: 'Yesterday',
    url: 'https://store.steampowered.com/',
    body: [
      'The list favours demos that respect the player’s time: a clear hook within ten minutes, a save system that works, and no fake “wishlist to continue” wall.',
      'The standout is a tiny management game about running a late-night coffee shop. The loop is simple, but the pacing and sound design are remarkably confident.',
      'All five demos are free during the festival. The article notes that demo availability can change after the event.'
    ],
    tags: ['Games', 'Demo', 'Design'],
    metric: 'Next Fest'
  },
  {
    id: 'fc-10',
    source: 'news',
    sourceLabel: 'News',
    topic: 'AI & Tech',
    title: 'On-device inference is getting faster — memory bandwidth is still the limit',
    summary:
      'Quantisation, speculative decoding and operator fusion are pushing 3B models into a usable range on phones, but memory bandwidth remains the main bottleneck.',
    glyph: '◫',
    cover: 'linear-gradient(135deg, #cdeee4 0%, #92d5c4 50%, #3f9b86 100%)',
    readingTime: '5 min read',
    published: '4h ago',
    url: 'https://www.example.com/',
    body: [
      'The article surveys the last six months of mobile inference work: more aggressive quantisation, attention operator fusion, and splitting long contexts into cacheable blocks.',
      'Benchmarks show clear improvements in first-token latency, but sustained generation is limited by memory bandwidth. For agent scenarios, first-token latency is often more important than peak throughput.',
      'The article closes with a reminder that on-device models are not suitable for every task. Queries that need live external data still belong on cloud tools.'
    ],
    tags: ['On-device', 'Inference', 'Open models'],
    metric: 'Tech · 5 min read'
  },
  {
    id: 'fc-11',
    source: 'news',
    sourceLabel: 'Global News',
    topic: 'AI & Tech',
    title: 'AI assistants move from chat to tasks',
    summary:
      'A survey of assistant products shifting from conversational answers to multi-step task execution with approvals.',
    glyph: '◧',
    cover: 'linear-gradient(135deg, #ffe6c7 0%, #f7c58b 50%, #d4934f 100%)',
    readingTime: '6 min read',
    published: 'Today',
    url: 'https://www.example.com/',
    body: [
      'The article argues that the chat box was a useful first interface, but it hides the state of a long-running task. Users need to see what is running, what is blocked and what needs approval.',
      'Products that expose task state and a clear audit trail report higher completion rates, especially for tasks that involve external accounts.',
      'The remaining gap is trust: users still want a fast way to cancel, undo or verify a result against the original source.'
    ],
    tags: ['Assistants', 'Tasks', 'Trust'],
    metric: 'World · 5 min read'
  },
  {
    id: 'fc-12',
    source: 'rss',
    sourceLabel: 'RSS',
    topic: 'Product Design',
    title: 'Tech weekly: tools are becoming more like colleagues',
    summary:
      'This issue looks at personal knowledge bases, on-device models and how small teams choose tools, plus a week of worthwhile links.',
    glyph: 'R',
    cover: 'linear-gradient(135deg, #f6e6c8 0%, #e8cd96 50%, #b28b4d 100%)',
    readingTime: '12 min read',
    published: 'Today',
    url: 'https://www.ruanyifeng.com/blog/',
    body: [
      'The weekly sorts tools into three categories: amplifiers, agents and colleagues. Amplifiers wait for instructions, agents execute tasks, and colleagues proactively remind and challenge.',
      'The author argues that most so-called AI products are still amplifiers. A true colleague-like tool needs long-term memory, clear boundaries and explainable actions.',
      'The issue also includes an article on local-first software and an experiment that reorganises an information feed with RSS.'
    ],
    tags: ['RSS', 'Weekly', 'Tools'],
    metric: 'RSS feed'
  }
];

export const seedSkills: Skill[] = [
  {
    id: 'general',
    name: 'General assistant',
    icon: '✦',
    category: 'Efficiency',
    description: 'Task breakdown, writing, summaries and everyday Q&A.',
    author: 'DigitalMate',
    installed: true,
    enabled: true,
    builtin: true
  },
  {
    id: 'travel',
    name: 'Travel planner',
    icon: '🧭',
    category: 'Travel',
    description: 'Compare trains and flights, build itineraries and transfer advice.',
    author: 'DigitalMate',
    installed: true,
    enabled: true
  },
  {
    id: 'train',
    name: 'Train search',
    icon: '🚄',
    category: 'Travel',
    description: 'Query 12306 availability and prices, keeping the source.',
    author: 'DigitalMate',
    installed: true,
    enabled: true
  },
  {
    id: 'mail',
    name: 'Email drafts',
    icon: '✉️',
    category: 'Efficiency',
    description: 'Summarise Gmail and QQ Mail, draft without sending.',
    author: 'DigitalMate',
    installed: false,
    enabled: false
  },
  {
    id: 'calendar',
    name: 'Calendar planner',
    icon: '🗓️',
    category: 'Efficiency',
    description: 'Read Google Calendar, create and adjust events.',
    author: 'DigitalMate',
    installed: true,
    enabled: false
  },
  {
    id: 'discovery',
    name: 'Content discovery',
    icon: '◎',
    category: 'Life',
    description: 'Aggregate videos, articles and discussions by interest, keeping sources.',
    author: 'DigitalMate',
    installed: true,
    enabled: true
  },
  {
    id: 'shopping',
    name: 'Shopping compare',
    icon: '🛍️',
    category: 'Life',
    description: 'Compare public specs and prices; never infer stock.',
    author: 'Community',
    installed: false,
    enabled: false
  },
  {
    id: 'research',
    name: 'Code research',
    icon: '⌘',
    category: 'Research',
    description: 'Read repositories, trace call paths and produce verifiable findings.',
    author: 'Community',
    installed: true,
    enabled: true
  },
  {
    id: 'coffee',
    name: 'Coffee & local life',
    icon: '☕',
    category: 'Life',
    description: 'Aggregate nearby places by location, distance and rating.',
    author: 'DigitalMate',
    installed: true,
    enabled: true
  }
];

export const memoryProfile: MemoryProfile = {
  name: 'Lin Wei',
  headline: 'Product designer · Shenzhen',
  summary:
    'Interested in AI agents, HarmonyOS and open-source tools. Prefers to break complex tasks into verifiable steps, and likes finding a quiet coffee shop to read in on weekends.',
  tags: ['AI agents', 'HarmonyOS', 'Open source', 'Coffee', 'City walks'],
  mbti: 'INTJ · 68% confidence',
  sections: [
    {
      title: 'Background',
      body: 'Works on product design in Shenzhen, with experience in mobile tools and content products. Spent the last year focused on agent interaction and structured interfaces.'
    },
    {
      title: 'Interests and preferences',
      body: 'Likes low-saturation, warm-white visuals, design retrospectives and implementation details. Usually orders an oat latte with less sugar.'
    },
    {
      title: 'Communication style',
      body: 'Prefers the conclusion first, then the evidence. Dislikes aggressive marketing language and wants failures and limits stated clearly.'
    },
    {
      title: 'Recent focus',
      body: 'On-device memory, the A2UI component catalog, discovery deduplication and ranking, and HarmonyOS 2-in-1 support.'
    }
  ]
};
