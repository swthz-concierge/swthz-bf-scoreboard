// Incoming SMS webhook. Point your Twilio number's "A message comes in" here.
exports.handler = async function (context, event, callback) {
  const h = require(Runtime.getFunctions()['helpers'].path);
  const twiml = new Twilio.twiml.MessagingResponse();
  const reply = (msg) => { twiml.message(msg); callback(null, twiml); };

  try {
    const body = String(event.Body || '').trim();
    const from = event.From;
    const roster = h.loadRoster();
    const person = roster[from];

    if (!person) {
      return reply("This number isn't on the SWTHZ Black Friday roster. Ask your manager to add you.");
    }

    const list = await h.getList(context);
    const cmd = body.toLowerCase();

    // "score" / "scores" -> current standings
    if (cmd === 'score' || cmd === 'scores' || cmd === 'board') {
      const s = h.summarize(await h.allItems(list), context);
      return reply(h.standingsLine(s));
    }

    // "undo" -> remove your own most recent entry
    if (cmd === 'undo') {
      const items = await h.allItems(list);
      const mine = items.filter((i) => i.data && i.data.from === from).pop();
      if (!mine) return reply('Nothing to undo.');
      await list.syncListItems(mine.index).remove();
      const s = h.summarize(items.filter((i) => i.index !== mine.index), context);
      return reply(`↩️ Removed ${mine.data.n > 0 ? '+' : ''}${mine.data.n} ${h.LOCATIONS[mine.data.code]}.\n${h.standingsLine(s)}`);
    }

    const entry = h.parseEntry(body);
    if (!entry || entry.error) {
      return reply('Format: +1 PV, +2 Chandler, +1 Salt River (or -1 PV to fix). Text SCORE for standings, UNDO to remove your last entry.');
    }

    // Default to the person's home studio if they somehow omit it (not reachable via parser, kept for safety)
    const code = entry.code || person.studio;

    await list.syncListItems.create({
      data: { n: entry.n, code, name: person.name, from, ts: new Date().toISOString(), sid: event.MessageSid },
    });

    const s = h.summarize(await h.allItems(list), context);
    const loc = s.locations.find((l) => l.code === code);
    const sign = entry.n > 0 ? '+' : '';
    const goalTxt = loc.goal ? ` / ${loc.goal}` : '';
    const cheer = entry.n > 0 ? `🔥 Nice, ${person.name}! You sold ${entry.n} at ${loc.name}.` : `✅ Fixed: ${entry.n} ${loc.name}.`;
    return reply(`${cheer} ${loc.name}: ${loc.total}${goalTxt}\n${h.standingsLine(s)}`);
  } catch (err) {
    console.error(err);
    return reply('Scoreboard hiccup — try again in a minute.');
  }
};
