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

// --------------------------- Middleware ---------------------------

// Parse incoming requests
app.use(bodyParser.raw({ type: 'application/jwt' })); // For JWT payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());
// --------------------------- Static Assets ------------------------
app.use('/slds', express.static(path.join(__dirname, 'node_modules/@salesforce-ux/design-system/assets')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'publicFiles')));

// --------------------------- View Engine --------------------------
app.set('view engine', 'ejs');

// --------------------------- Routes -------------------------------
const customActivityRouter = require('./custom-activity/custom_activity_routes');
app.use('/custom-activity', customActivityRouter);
app.use('/custom-content-block', customContentBlockRouter);

// Health Check Endpoint
app.get('/health', (req, res) => res.status(200).send('OK VIBER\n'));
app.get('/icon.png', (req, res) => {
  res.writeHead(301, {
    Location: req.url.replace('/icon.png', '/assets/icons/viber_icon_80.png')
}).end();
})
//This is use for Viber registration domain
app.get('/', (req, res)=> {
    res.send('<html><head><meta name="viber-platform-site-verification" content="NVxbSfRASoH6tAS7jDHqKMhUqsY6g0SsDJOv" /></head><body></body></html>');
  });
app.get('/viber_verifierNVxbSfRASoH6tAS7jDHqKMhUqsY6g0SsDJOv.html', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public/js', 'viber_verifierNVxbSfRASoH6tAS7jDHqKMhUqsY6g0SsDJOv.html')
  );
});
  
app.post('/webhook', (req, res) => {
  webhook.processRequest(req, res);
  res.sendStatus(200);
})

app.post('/mcTemplates', async (req, res) => {
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

const port = process.env.PORT || 3001;

// --------------------------- local -------------------------------
app.listen(port, () => {console.log(`Server is listening on port ${port}`);});
// --------------------------- server -------------------------------
// module.exports = app;
