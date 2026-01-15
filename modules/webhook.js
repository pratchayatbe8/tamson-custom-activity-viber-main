const mc = require('./mc');
const config = require('../config');
const logger = require('./logger');

const webhook = {};

webhook.processRequest = async (req, res) => {
  const receivedAt = new Date().toISOString();

  try {
    const event = req.body;

    /* ---------------------------------
       1. Validate request body
    ----------------------------------*/
    if (!event || typeof event !== 'object') {
      logger.warn(`[Webhook] Invalid or empty request body`);
      return res.status(400).json({ message: 'Invalid request body' });
    }

    /* ---------------------------------
       2. Debug logging (payload)
    ----------------------------------*/
    if (process.env.DEBUG_LOG === 'true') {
      logger.info(`[Webhook] Payload: ${JSON.stringify(event)}`);
    }

    /* ---------------------------------
       3. Validate upstream error flag
    ----------------------------------*/
    if (event.error !== 0) {
      logger.warn(
        `[Webhook] Ignored event due to upstream error flag: ${event.error}`
      );
      return res.status(200).json({ message: 'Ignored (error flag)' });
    }

    /* ---------------------------------
       4. Validate data object
    ----------------------------------*/
    const data = event.data;

    if (!data) {
      logger.warn(`[Webhook] Missing data object`);
      return res.status(400).json({ message: 'Missing data object' });
    }

    if (data.channel !== 'viber') {
      logger.warn(`[Webhook] Unsupported channel: ${data.channel}`);
      return res.status(403).json({ message: 'Unsupported channel' });
    }

    if (!data.msg_status || !data.transaction_id) {
      logger.warn(
        `[Webhook] Missing required fields | msg_status=${data.msg_status}, transaction_id=${data.transaction_id}`
      );
      return res.status(400).json({ message: 'Missing required fields' });
    }

    /* ---------------------------------
       5. Build update payload
    ----------------------------------*/
    let updatePayload = null;

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
        logger.info(
          `[Webhook] Ignored msg_status: ${data.msg_status}`
        );
        return res.status(200).json({ message: 'Ignored status' });
    }

    /* ---------------------------------
       6. Upsert to SFMC
    ----------------------------------*/
    await mc.upsertDERow(config.sfmc.logDeName, updatePayload);

    // if (process.env.DEBUG_LOG === 'true') {
      logger.info(
        `[Webhook] Successfully processed | status=${data.msg_status}, transaction_id=${data.transaction_id}`
      );
    // }

    return res.status(200).json({ message: 'Processed successfully' });

  } catch (err) {
    logger.error(
      `[Webhook] Unhandled exception: ${err?.message || err}`
    );
    return res.status(500).json({ message: 'Internal server error' });
  }
};



module.exports = webhook; 