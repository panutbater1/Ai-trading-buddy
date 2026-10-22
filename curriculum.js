// Pip's beginner path. Each stage unlocks the next; lessons can have tasks, a quiz,
// a tool (sizer / journal / plan / golive), and a "show" query Pip can find on screen.
// Task `auto` ids are checked automatically by sidepanel.js (see AUTO in that file).
const CURRICULUM = [
  {
    id: 'screen', title: 'Know your screen', blurb: 'Learn what every part of the trading platform does.',
    lessons: [
      {
        id: 'tour', title: "Take Pip's screen tour",
        body: [
          'Open your trading platform in this tab and press "Tour this screen" at the top of this panel. I\'ll walk to each important part and explain it.',
          "Don't worry about remembering everything. You can turn on Explain mode any time and click anything you've forgotten.",
        ],
        tasks: [{ id: 'tour-done', text: 'Finish the screen tour', auto: 'tourDone' }],
      },
      {
        id: 'words', title: 'The five words you need',
        body: [
          'Ticker: the short code for a company or asset, like AAPL for Apple.',
          'Bid and ask: the bid is the most buyers will pay right now, the ask is the least sellers will accept. The gap between them is the spread, a small cost on every trade.',
          'Market order: buys or sells right now at the best available price.',
          'Limit order: only trades at your price or better. It might not fill, but it never surprises you.',
          'Stop-loss: an order that sells automatically if the price drops to a level you choose, so one bad trade can\'t hurt you too much.',
        ],
        quiz: [
          { q: 'You want to buy, but only if the price is $50 or lower. Which order do you use?', options: ['Market order', 'Limit order', 'Stop-loss'], answer: 1, why: 'A limit order only fills at your price or better.' },
          { q: 'The bid is $99.98 and the ask is $100.02. What do you usually pay when you buy?', options: ['$99.98', '$100.00', '$100.02'], answer: 2, why: 'You buy at the ask, the lowest price a seller will accept.' },
          { q: 'What does a stop-loss do?', options: ['Sells automatically if the price falls to your level', 'Stops you from trading for the day', 'Guarantees a profit'], answer: 0, why: 'It caps how much you can lose on one trade.' },
        ],
        tasks: [{ id: 'quiz-pass', text: 'Get all three quiz questions right', auto: 'quizPassed' }],
      },
    ],
  },
  {
    id: 'paper', title: 'Practice with fake money', blurb: 'Make your mistakes where they cost nothing.',
    lessons: [
      {
        id: 'find-paper', title: 'Switch on paper trading', show: 'the paper trading / practice / demo account switch or menu',
        body: [
          'Paper trading means trading with pretend money on real prices. Almost every platform has it, sometimes called "practice", "demo" or "simulated" trading.',
          'Stay in paper mode until you finish this whole guide. Real traders practice for weeks or months first.',
        ],
        tasks: [{ id: 'paper-on', text: 'I found paper trading and switched it on' }],
      },
      {
        id: 'first-trades', title: 'Place your first 3 paper trades', show: 'the order ticket where you place a buy order',
        body: [
          'Pick a large, well-known company. Buy a small number of shares with a market order. Watch it for a while, then sell.',
          'Before every trade, write down why you are taking it. After every trade, log it in your journal below. The journal is how you learn.',
        ],
        tool: 'journal',
        tasks: [
          { id: 'trade-1', text: 'Log 1 paper trade in the journal', auto: 'journal1' },
          { id: 'trade-3', text: 'Log 3 paper trades in the journal', auto: 'journal3' },
        ],
      },
      {
        id: 'limit-try', title: 'Try a limit order', show: 'the order type dropdown (market / limit)',
        body: [
          'Place a paper buy limit order a little below the current price. It may sit there as "working" or "open" until the price comes down to it.',
          'Notice that it might never fill. That\'s the trade-off: you control the price, but not whether you get in.',
        ],
        tasks: [{ id: 'limit-placed', text: 'I placed a limit order and watched what happened' }],
      },
    ],
  },
  {
    id: 'risk', title: 'Protect your money', blurb: 'The most important stage. Good traders are good at losing small.',
    lessons: [
      {
        id: 'one-percent', title: 'The 1% rule',
        body: [
          'Never risk more than 1% of your account on one trade. With $5,000, that means losing at most $50 if the trade goes wrong.',
          '"Risk" is not how much you spend. It\'s how much you lose if your stop-loss is hit: (entry price − stop price) × shares.',
          'Use the calculator below to work out how many shares to buy for any trade.',
        ],
        tool: 'sizer',
        tasks: [{ id: 'sizer-used', text: 'Work out a position size with the calculator', auto: 'sizerUsed' }],
      },
      {
        id: 'always-stop', title: 'Always set a stop-loss', show: 'the stop-loss or stop order field',
        body: [
          'Decide where you are wrong before you enter, and set a stop-loss there. Put it somewhere that makes sense on the chart, like just below a recent low.',
          'Never move a stop further away to "give it room". That is how small losses become big ones.',
        ],
        tasks: [{ id: 'stop-trades', text: 'Place 3 paper trades that all have a stop-loss' }],
      },
      {
        id: 'mindset', title: 'Losses are normal',
        body: [
          'Even professional traders lose on a large share of their trades. What matters is that losses stay small and wins are allowed to run.',
          'Two habits that wreck beginners: "revenge trading" (jumping straight back in to win back a loss) and adding money to a losing trade. If you feel angry or rushed, stop for the day.',
        ],
        tasks: [{ id: 'daily-limit', text: 'Pick a daily loss limit. When I hit it, I stop trading for the day.' }],
      },
    ],
  },
  {
    id: 'charts', title: 'Read a chart', blurb: 'Simple chart reading to help you decide when to get in and out.',
    lessons: [
      {
        id: 'candles', title: 'Candles and timeframes', show: 'the price chart',
        body: [
          'Each candle is one slice of time. Green closed higher than it opened, red closed lower. The thin wicks show the high and low.',
          'Try switching timeframes. A daily chart shows the big picture; a 5-minute chart shows the noise inside a single day. Beginners do better on longer timeframes.',
        ],
        tasks: [{ id: 'tf-switch', text: 'I switched between a daily and a 5-minute chart' }],
      },
      {
        id: 'trend', title: 'Spot the trend',
        body: [
          'An uptrend makes higher highs and higher lows, like climbing stairs. A downtrend makes lower highs and lower lows.',
          'A simple beginner rule: only buy when the daily chart is in an uptrend. Don\'t try to catch a falling price.',
        ],
        tasks: [{ id: 'trend-3', text: 'Look at 3 charts and decide: uptrend, downtrend or sideways?' }],
      },
      {
        id: 'levels', title: 'Support and resistance',
        body: [
          'Support is a price where buyers have stepped in before, so the price tends to bounce up from it. Resistance is where sellers have stepped in, so the price tends to stall below it.',
          'Look for prices the chart has touched several times. These are useful places for stop-losses (just below support) and profit targets (just below resistance).',
        ],
        tasks: [{ id: 'levels-drawn', text: 'Find one support and one resistance level on a chart' }],
      },
      {
        id: 'volume', title: 'Volume', show: 'the volume bars or volume indicator',
        body: [
          'Volume is how many shares traded. Big moves on high volume mean more people agree with the move. Big moves on low volume are easier to reverse.',
        ],
        tasks: [{ id: 'volume-found', text: 'I found the volume on my chart' }],
      },
    ],
  },
  {
    id: 'plan', title: 'Make a trading plan', blurb: 'Write your rules down so emotions don\'t make your decisions.',
    lessons: [
      {
        id: 'build-plan', title: 'Write your plan',
        body: [
          'A trading plan is a short set of rules you follow every time: what you trade, when you get in, when you get out, and how much you risk.',
          'Keep it simple enough to fit on one screen. Fill in the template below. You can change it later as you learn.',
        ],
        tool: 'plan',
        tasks: [{ id: 'plan-saved', text: 'Fill in every part of the plan', auto: 'planComplete' }],
      },
      {
        id: 'follow-plan', title: 'Trade only your plan',
        body: [
          'For the next 10 paper trades, only take trades that match your plan. In the journal, note whether each trade followed the plan.',
          'A losing trade that followed the plan is a good trade. A winning trade that broke the plan is a bad habit getting rewarded.',
        ],
        tool: 'journal',
        tasks: [{ id: 'plan-10', text: 'Log 10 paper trades in the journal', auto: 'journal10' }],
      },
    ],
  },
  {
    id: 'review', title: 'Review and improve', blurb: 'Turn your journal into lessons.',
    lessons: [
      {
        id: 'weekly', title: 'Your weekly review',
        body: [
          'Once a week, read your journal and answer three questions: What did I do well? What mistake did I repeat? What one thing will I change next week?',
          'Look at your stats below. Win rate alone means little; check that your average win is bigger than your average loss.',
        ],
        tool: 'journal',
        tasks: [
          { id: 'review-1', text: 'Do my first weekly review' },
          { id: 'journal-20', text: 'Log 20 paper trades in the journal', auto: 'journal20' },
        ],
      },
    ],
  },
  {
    id: 'live', title: 'Before real money', blurb: 'Only move on when every box is honestly ticked.',
    lessons: [
      {
        id: 'golive', title: 'The go-live checklist',
        body: [
          'Many beginners lose money in their first year. There is no rush. Paper trading for longer is always fine.',
          'If you do go live, start with an amount you could lose completely without it affecting your life, and trade smaller than you did on paper. Real money feels very different.',
          'Pip teaches how trading works. It is not financial advice and never tells you what to buy.',
        ],
        tool: 'golive',
        tasks: [{ id: 'golive-all', text: 'Tick every item on the go-live checklist', auto: 'goliveAll' }],
      },
    ],
  },
];

const GOLIVE_ITEMS = [
  'I have logged at least 20 paper trades',
  'I followed my trading plan on my last 10 trades',
  'Every trade I take has a stop-loss',
  'I never risk more than 1% of my account per trade',
  'I understand my broker\'s fees and how trading affects my taxes',
  'The money I\'m starting with is money I can afford to lose',
  'I have a daily loss limit and I stop when I hit it',
];

const PLAN_FIELDS = [
  { id: 'what', label: 'What I trade', ph: 'e.g. Large US companies only, no options' },
  { id: 'when', label: 'When I trade', ph: 'e.g. After the first 30 minutes of the day' },
  { id: 'entry', label: 'When I buy', ph: 'e.g. Daily uptrend and price bounces off support' },
  { id: 'exit', label: 'When I sell', ph: 'e.g. Stop just below support; take profit near resistance' },
  { id: 'risk', label: 'Max risk per trade', ph: 'e.g. 1% of account' },
  { id: 'daily', label: 'Daily loss limit', ph: 'e.g. Stop after 2 losing trades or 2% down' },
];
