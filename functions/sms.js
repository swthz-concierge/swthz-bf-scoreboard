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

    // Manager correction: text the correct studio total, e.g. "153"
    const set = h.parseSetTotal(body);
    if (set) {
      const role = person.role || 'staff';
      if (role !== 'manager' && role !== 'admin') {
        return reply('Only studio managers can set a total. To log a sale, text +1 PV, +1 Chandler or +1 Salt River.');
      }
      const code = set.code || person.studio;
      if (role === 'manager' && code !== person.studio) {
        return reply(`You can only set the ${h.LOCATIONS[person.studio]} total.`);
      }
      if (set.total > h.MAX_TOTAL) return reply(`That number looks too high (max ${h.MAX_TOTAL}).`);
      const before = h.summarize(await h.allItems(list), context);
      const current = before.locations.find((l) => l.code === code).total;
      const diff = set.total - current;
      if (diff === 0) return reply(`${h.LOCATIONS[code]} is already at ${current}. No change.`);
      await list.syncListItems.create({
        data: { n: diff, code, name: person.name, from, adjust: true, ts: new Date().toISOString(), sid: event.MessageSid },
      });
      const after = h.summarize(await h.allItems(list), context);
      return reply(`✏️ ${h.LOCATIONS[code]} total changed from ${current} to ${set.total}. (Text UNDO to reverse.)\n${h.standingsLine(after)}`);
    }

    const entry = h.parseEntry(body);
    if (!entry || entry.error) {
      return reply('Format: +1 PV, +2 Chandler, +1 Salt River (or -1 PV to fix). Text SCORE for standings, UNDO to remove your last entry. Managers: text just the number (e.g. 153) to set your studio total.');
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
