const mc = require('./mc');
const config = require('../config');
const logger = require('./logger');

const webhook = {};

webhook.processRequest = async (req, res) => {

  const event = req.body;

  const sentDate = new Date();
  const msgDateText = sentDate.toISOString();

  if (process.env.DEBUG_LOG)
    logger.info(JSON.stringify(event));

  if (event.error != 0)
    return;

  if (!event.data && !event.data.msg_status && event.data.channel != 'viber')
    return;
  try {
    switch (event.data.msg_status) {
      case 'DELIVRD':
        var obj = {
          'Message_ID': event.data.transaction_id,
          'Delivery_Date': msgDateText,
          'Delivery_Status': true
        };
        mc.upsertDERow(config.sfmc.logDeName, obj)
          .catch(err => { logger.error(`[Exception in webhook - DELIVRD] ${err}`) });
        break;


      case 'SEEN':
        var obj = {
          'Message_ID': event.data.transaction_id,
          'Seen_Date': msgDateText,
          'Seen_Status': true
        };
        mc.upsertDERow(config.sfmc.logDeName, obj)
          .catch(err => { logger.error(`[Exception in webhook - SEEN] ${err}`) });
        break;
    }
  }
  catch (err) {
    logger.error(`[Exception in webhook] ${err}`);
  }
}

module.exports = webhook; 