# Pip – Trading Buddy (Chrome extension prototype)

An animated buddy that lives in your browser's side panel, walks across any web trading platform to explain it, and then coaches beginners through a step-by-step learning path.

## Try it
1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, pick this folder.
2. Click the Pip icon in the toolbar. The side panel opens.
3. In **Settings**, paste an Anthropic API key (stored only in this browser).
4. Open a web trading platform (ideally in paper-trading mode) and reload it once.

## The side panel
- **Tour this screen**: Pip screenshots the page, Claude finds the key controls, and Pip walks to each one in order. Finishing the tour ticks off the first guide step.
- **Explain mode**: click anything on the page and Pip walks over and explains it. Page clicks are blocked while it's on.
- **Guide**: a 7-stage beginner path that unlocks stage by stage:
  1. Know your screen (tour + 5-word quiz)
  2. Practice with fake money (paper trading, first trades, limit orders)
  3. Protect your money (1% rule with a position-size calculator, stop-losses, mindset)
  4. Read a chart (candles, trend, support/resistance, volume)
  5. Make a trading plan (plan builder, trade only your plan)
  6. Review and improve (weekly review, journal stats)
  7. Before real money (go-live checklist)

  Lessons with **Show me on my screen** make Pip find that control on the live platform.
- **Ask Pip**: chat with Pip, optionally letting it see your screen.

Progress, the trade journal and the trading plan are saved in `chrome.storage.local`.

## Files
- `sidepanel.html` / `.css` / `.js`: the side panel UI, guide, tools and chat.
- `curriculum.js`: all lesson content. Edit this to change the guide.
- `content.js`: draws Pip on the page (Shadow DOM) and handles walking, pointing and bubbles.
- `background.js`: opens the side panel, takes screenshots, and calls Claude.

## Limits
- Web platforms only. Desktop apps need a separate desktop overlay app.
- The API key lives in the extension. For a public release, route calls through your own backend.
- Pip is educational only: no buy/sell picks or price predictions.
