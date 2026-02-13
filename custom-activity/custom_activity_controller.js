/**
 * ============================================================================
 * Server Side Controller
 * ============================================================================
 */
const mc = require('../modules/mc');
const controller = {};
const config = require("../config");
const { v4: uuidv4 } = require('uuid');

const viber = require('../modules/vietguys');
const logger = require('../modules/logger');
const jwt = require('jsonwebtoken');
const util = require('../modules/util');

/**
 * ============================================================================
 * Execute
 * ============================================================================
 */

controller.execute = async (req, res) => {
    try {
        const data = require('jsonwebtoken').verify(req.body.toString('utf8'), config.sfmc.jwt, { algorithm: 'HS256' });
        if (data) {
            await process(data);
            res.sendStatus(200);

        }
        else {
            console.log('[controller.execute] ERROR: Execute Data not available');
            res.sendStatus(200);
        }
    }
    catch (err) {
        console.log('[controller.execute] FETAL ERROR: ', err.message);
        res.sendStatus(200);
    }

}

/**
 * ============================================================================
 * Process Function after execute
 * ============================================================================
 */

async function process(body) {

    const obj = body.inArguments[0];
    const activityRequestId = uuidv4();
    const record = obj.targetValues;

    const mcRecord = {
        'Request_ID': activityRequestId,
        'Viber_ID': obj.uid,
        'Message_Name': obj.messageName,
        // 'Journey_Name' : obj.settings.journeyName, //Use automation to fetch these using activityId will get latest value
        // 'Journey_ID' : obj.settings.journeyVersionId,
        // 'Journey_Version': obj.settings.journeyVersion,
        'Message_Type': obj.messageType,
        'OA_ID': obj.viberAccount,
        'OA_KEY': obj.viberAccountKey,
        'OA_Name': obj.viberAccountName,
        'Activity_ID': body.activityId,
    };

    try {

        const token = await util.getViberAccessToken(obj.viberAccountKey);
        let viberPayload = {};

        const sentDate = new Date();
        mcRecord['Sent_Date'] = sentDate.toISOString();
        mcRecord['Template_ID'] = obj.viberContentId;

        if (obj.messageType === 'ViberOA') {
            const content = obj.viberContentObject;

            let uData = content.meta.options.customBlockData.u;
            let viberMessage = content.meta.options.customBlockData.message;

            if (content.meta.options.customBlockData.type === 'text-area' || content.meta.options.customBlockData.type === 'form-photo') {
                const expr = /%%[\w-]+%%/g;
                const matches = viberMessage.text.match(expr);
                if (matches) {
                    matches.forEach(matchedItem => {
                        const fieldName = matchedItem.substring(2, matchedItem.length - 2);
                        if (record[fieldName])
                            viberMessage.text = viberMessage.text.replace(matchedItem, record[fieldName]);
                    });
                }
            }

            viberPayload = {
                "username": obj.viberAccount,
                "mobile": obj.uid,
                "bid": activityRequestId,
                "channel": "viber",
                "viber": {
                    "brand": obj.viberAccountName,
                    "message": viberMessage.text,
                    "action_text": uData ? uData.formActionText : "",
                    "action_link": uData ? uData.formActionLink : "",
                    "image": uData ? uData.photo : "",
                    "ttl": 3600
                }
            }
            console.log('[process] DEBUG: viberPayload: ', viberPayload);

        }
        else {
        }
        // console.log('[process] DEBUG: viberPayload: ', viberPayload);

       

        const viberResponse = await viber.sendMessage(token, viberPayload);

        // console.log('[process] DEBUG: viberResponse: ', viberResponse);

        let viberMessageId = '';
        if (viberResponse.error === 0) {
            viberMessageId = viberResponse.data.transaction_id;
            mcRecord['API_Response_Code'] = viberResponse.error;
            mcRecord['API_Response_Message'] = viberResponse.message;
        }
        else { //Viber return error
            logger.error(`[Viber Response Error] - ${obj.contactKey}-${obj.uid} - ${JSON.stringify(viberResponse)}`);
            mcRecord['API_Response_Error'] = viberResponse.message;
            mcRecord['API_Response_Code'] = viberResponse.error;

            if(viberResponse.data && viberResponse.data.transaction_id){
                viberMessageId = `${viberResponse.data.transaction_id}`;
            }
            else{
                viberMessageId = `${activityRequestId}`;
            }

        }

        mcRecord['Message_ID'] = viberMessageId;
        //Tracking sent message
        mc.createDERow(config.sfmc.logDeName, mcRecord).catch(mcError => {
            logger.error(`[MC Error during creating tracking record] - ${obj.contactKey}-${obj.uid} -  ${mcError}`);
        })

    }
    catch (err) {
        // Activity Level Error
        mcRecord['Message_ID'] = `${activityRequestId}`;
        mcRecord['Activity_Error'] = err.message;

        logger.error(`[Exception in processRequest] ${obj.contactKey}-${obj.uid} - ${err} -${err.stack}`);
        //Tracking sent message
        mc.createDERow(config.sfmc.logDeName, mcRecord).catch(mcError => {
            logger.error(`[MC Error during creating tracking record] - ${obj.contactKey}-${obj.uid} -  ${mcError}`);
        })
    }
}

/**
 * ============================================================================
 * Utilities of Controller
 * ============================================================================
 */
controller.getDataExtensions = () => {
    return mc.getAllDataExtensions();
};
controller.getDERows = (dataExtensionName, fields, filter) => {
    return mc.getDERows(dataExtensionName, fields, filter);
};
controller.getDataExtensionFields = (dataExtensionKey) => {
    return mc.getDataExtensionFields(dataExtensionKey);
};
// controller.getContentById = (contentId) => {
//     return mc.getContentById(contentId, ['Views']);
// }

controller.getViberMessages = () => {
    let fields = ['Id', 'Name'],
        viberFolderName = config.sfmcContentCategories.customBlockPrefix,
        assetTypeId = config.sfmcAssetTypes.customBlock;

    let query = {
        "leftOperand":
        {
            "property": "name",
            "simpleOperator": "startsWith",
            "value": viberFolderName
        },
        "logicalOperator": "AND",
        "rightOperand":
        {
            "property": "assetType.id",
            "simpleOperator": "equals",
            "value": assetTypeId
        }
    }


    return mc.getContent(fields, query);
}

controller.getCustomContentBlocks = async () => {
    let fields = ['Id', 'Name', 'meta'],
        viberFolderName = config.sfmcContentCategories.customBlockPrefix,
        assetTypeId = config.sfmcAssetTypes.customBlock;

    let query = {
        "leftOperand":
        {
            "property": "name",
            "simpleOperator": "startsWith",
            "value": viberFolderName
        },
        "logicalOperator": "AND",
        "rightOperand":
        {
            "property": "assetType.id",
            "simpleOperator": "equals",
            "value": assetTypeId
        }
    }


    return mc.getContent(fields, query);
}

controller.getContentById = (contentId) => {
    let fields = ['content', 'meta'];
    let result = mc.getContentById(contentId, fields);
    return result;
};


module.exports = controller; 
