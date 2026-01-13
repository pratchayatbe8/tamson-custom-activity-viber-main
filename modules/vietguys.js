const axios = require('axios');
const config = require('../config.js');
const logger = require('./logger');
const FormData = require('form-data');

const viber = {};

viber.sendMessage = async (token, payload) => {
    const options = {
        method : 'post',
        url : config.viber.oaEndpoint,
        responseType : 'json',
        data : payload,
        headers : {
            'Content-Type': 'application/json',
            //'X-Viber-Auth-Token' : token,
            // 'Accept':'application/json',
            'Access-Token': token
        }
    }
    // console.log('[process] DEBUG: options: ', options);

    try {
        const response = await axios(options);
        return response.data;
      } catch (error) {
        if (error.response) {
          return error.response.data;
        }
        return {
          error: 9999,
          message: error.message
        };
      }

   
}

module.exports = viber;