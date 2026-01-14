/**
 * ============================================================================
 * Express Server Setup
 * ============================================================================
 */

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser');
dotenv.config();
const app = express();
const customContentBlockRouter = require('./custom-content-block/custom_content_block_routes');
const webhook = require('./modules/webhook');
const axios = require('axios')
const viber = require('./modules/vietguys')
const util = require('./modules/util')
const controller = require('./custom-activity/custom_activity_controller')

const viberRouter = express.Router(); // <--- ADD THIS LINE

// --------------------------- Middleware ---------------------------

// Parse incoming requests
// viberRouter.use(bodyParser.raw({ type: 'application/jwt' })); // For JWT payloads
// viberRouter.use(express.json());
// viberRouter.use(express.urlencoded({ extended: true }));
// viberRouter.use(express.text());

viberRouter.use(bodyParser.raw({ type: 'application/jwt' }));
viberRouter.use(express.json({
  strict: true,
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
viberRouter.use(express.urlencoded({ extended: true }));
viberRouter.use(express.text({ type: '*/*' }));
viberRouter.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.log(`[viberRouter] Invalid JSON received: ${req.rawBody}`);
    return res.status(400).json({
      message: 'Invalid JSON payload'
    });
  }
  next(err);
});


// --------------------------- Static Assets ------------------------
viberRouter.use('/slds', express.static(path.join(__dirname, 'node_modules/@salesforce-ux/design-system/assets')));
viberRouter.use('/images', express.static(path.join(__dirname, 'images')));
viberRouter.use(express.static(path.join(__dirname, 'public')));
viberRouter.use(express.static(path.join(__dirname, 'publicFiles')));

// --------------------------- View Engine --------------------------
app.set('view engine', 'ejs');

// --------------------------- Routes -------------------------------
const customActivityRouter = require('./custom-activity/custom_activity_routes');
viberRouter.use('/custom-activity-main', customActivityRouter);
viberRouter.use('/custom-content-block', customContentBlockRouter);

// Health Check Endpoint
viberRouter.get('/health', (req, res) => res.status(200).send('OK VIBER\n'));
viberRouter.get('/icon.png', (req, res) => {
  res.writeHead(301, {
    Location: req.url.replace('/icon.png', '/assets/icons/viber_icon_80.png')
}).end();
})

  
viberRouter.post('/webhook', (req, res) => {
  webhook.processRequest(req, res);
  // res.sendStatus(200);
})

viberRouter.post('/mcTemplates', async (req, res) => {
  try {
    const contentBlocks = await controller.getCustomContentBlocks();

    return res.status(200).send({
      error: 0,
      message: 'OK',
      data: contentBlocks.items || [],
      metadata: {
        total: contentBlocks.count || 0,
        page: contentBlocks.page,
        pageSize: contentBlocks.pageSize
      }
    });

  } catch (err) {
    console.error('/mcContentBlocks fatal:', err);
    return res.status(200).send({
      error: 999,
      message: 'Unhandled server error',
      data: [],
      metadata: { total: 0 }
    });
  }
});


/**
 * ============================================================================
 * Deployment
 * ============================================================================
 */

app.use('/viber', viberRouter);

const port = process.env.PORT || 3002;

// --------------------------- local -------------------------------
app.listen(port, () => {console.log(`Server is listening on port ${port}`);});
// --------------------------- server -------------------------------
// module.exports = app;
