// Public JSON feed the scoreboard polls. No phone numbers are exposed.
exports.handler = async function (context, event, callback) {
  const h = require(Runtime.getFunctions()['helpers'].path);
  const res = new Twilio.Response();
  res.appendHeader('Access-Control-Allow-Origin', '*'); // lets GitHub Pages read it
  res.appendHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.appendHeader('Content-Type', 'application/json');
  res.appendHeader('Cache-Control', 'no-store');

  try {
    const list = await h.getList(context);
    const summary = h.summarize(await h.allItems(list), context);
    summary.textNumber = context.DISPLAY_NUMBER || '';
    summary.title = context.BOARD_TITLE || 'SWTHZ Black Friday Showdown';
    res.setBody(summary);
  } catch (err) {
    console.error(err);
    res.setStatusCode(500);
    res.setBody({ error: 'unavailable' });
  }
  return callback(null, res);
};
