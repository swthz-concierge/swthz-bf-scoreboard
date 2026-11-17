// Wipes all entries. Visit: https://YOUR-SERVICE.twil.io/reset?key=YOUR_ADMIN_KEY
exports.handler = async function (context, event, callback) {
  if (!context.ADMIN_KEY || event.key !== context.ADMIN_KEY) {
    const r = new Twilio.Response();
    r.setStatusCode(403);
    r.setBody('Forbidden');
    return callback(null, r);
  }
  const svc = context.getTwilioClient().sync.v1.services(context.SYNC_SERVICE_SID);
  try { await svc.syncLists('bf-entries').remove(); } catch (e) { if (e.status !== 404) throw e; }
  await svc.syncLists.create({ uniqueName: 'bf-entries' });
  return callback(null, 'Scoreboard reset to zero.');
};
