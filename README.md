# Boomberg

Boomberg is my [SvelteHack 2024](https://hack.sveltesociety.dev/2024) entry (an attempt at "Wizzbangery Wizard"). It's also my 2024 attempt at a Christmas game for my friends, a tradition I've done (almost) every year for the past decade or so.

Boomberg is a stonk simulator. You are a trader at the BADSAQ exchange, you'll use your Boomberg terminal to make trades, take out highly leveraged loans from questionable sources, spread disinformation, and pay insiders for tips.

This project currently doesn't exist, because I haven't built any of it yet, but that's generally the next step after creating a blank Svelte 5 repo.

## Developing

### Get needed data

Download [a list of stock tickers from the SEC](https://www.sec.gov/files/company_tickers.json) to `src/lib/server/data/company_tickers.json`, then generate a preprocessed version used by the app with:

```
jq -c \
  'to_entries | map([.value.ticker, .value.title])' \
  company_tickers.json > ticker_pairs.json
```

This is used for generating room codes.

### Install dependencies + run

Install dependencies with `npm install`, then start a development server with:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of the app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## TODO

### Development

- [ ] Finish building lobby functionality
- [ ] Generate stonk trajectories
  - Each stonk should get a randomly generated trajectory
    - Shapes should be dramatic. Some should go way up, some should go sideways, some should legitimately crater, some should have crazy swings.
  - Use LLMs to create news events to explain the more major changes
  - Design the modifier system
    - Should use [tool use with Claude](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) to determine modifier values.
- [ ] Implement the `inbox` command and system
  - Messages should be stored in the DB
  - Pushed via WebSockets (take inspiration [from this repo](https://github.com/suhaildawood/SvelteKit-integrated-WebSocket/blob/main/src/hooks.server.ts))
  - `inbox list`, `inbox view <id>`, `inbox clear`, etc
  - Show count in status bar
- [ ] Build everything else

### Deployment

- [ ] Install an [adapter](https://svelte.dev/docs/kit/adapters), probably for Node.

## Questions

**What's the `.ignore` file symlink for?**

I've been playing around with [Jujutsu](https://github.com/martinvonz/jj), which is great fun, but my editor ([Helix](https://github.com/helix-editor/helix)) doesn't read the `.gitignore` file when there's no `.git` directory, but it [will read a `.ignore` file if you've got one](https://docs.helix-editor.com/editor.html#editorfile-picker-section).
