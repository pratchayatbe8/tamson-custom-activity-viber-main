const mc = require('./mc');
const config = require('../config');
const logger = require('./logger');

const webhook = {};

webhook.processRequest = async (req, res) => {
  const receivedAt = new Date().toISOString();

  try {
    const event = req.body;

    /* ---------------------------------
       1. Basic payload existence check
    ----------------------------------*/
    if (!event || typeof event !== 'object') {
      logger.warn('[Webhook] Invalid or empty body');
      return res.status(400).json({ message: 'Invalid request body' });
    }

    if (process.env.DEBUG_LOG) {
      logger.info('[Webhook] Payload:', JSON.stringify(event));
    }

    /* ---------------------------------
       2. Validate platform-level error
    ----------------------------------*/
    if (event.error !== 0) {
      logger.warn('[Webhook] Upstream error flag detected', event.error);
      return res.status(200).json({ message: 'Ignored (error flag)' });
    }

    /* ---------------------------------
       3. Validate required data fields
    ----------------------------------*/
    const data = event.data;

    if (!data) {
      logger.warn('[Webhook] Missing data object');
      return res.status(400).json({ message: 'Missing data object' });
    }

    if (data.channel !== 'viber') {
      logger.warn('[Webhook] Unsupported channel:', data.channel);
      return res.status(403).json({ message: 'Unsupported channel' });
    }

    if (!data.msg_status || !data.transaction_id) {
      logger.warn('[Webhook] Missing required fields', {
        msg_status: data.msg_status,
        transaction_id: data.transaction_id
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    /* ---------------------------------
       4. Handle message status
    ----------------------------------*/
    let updatePayload;

    switch (data.msg_status) {
      case 'DELIVRD':
        updatePayload = {
          Message_ID: data.transaction_id,
          Delivery_Date: receivedAt,
          Delivery_Status: true
        };
        break;

      case 'SEEN':
        updatePayload = {
          Message_ID: data.transaction_id,
          Seen_Date: receivedAt,
          Seen_Status: true
        };
        break;

      default:
        logger.info('[Webhook] Ignored msg_status:', data.msg_status);
        return res.status(200).json({ message: 'Ignored status' });
    }

    /* ---------------------------------
       5. Upsert to SFMC
    ----------------------------------*/
    await mc.upsertDERow(config.sfmc.logDeName, updatePayload);

    return res.status(200).json({ message: 'Processed successfully' });

  } catch (err) {
    logger.error('[Webhook] Unhandled exception', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


module.exports = webhook; 