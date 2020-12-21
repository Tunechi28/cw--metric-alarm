const AWS = require('aws-sdk');
const paramCache = {};

const config = {
    ec2AlarmNamespace: ['CWAgent', 'AWS/EC2'],
    name: 'cw-metric-alarm',
    slackUrl: ''
};

async function init() {
    try {
        config.slackUrl = await getParam(process.env.SLACKURLPARAM);
    }
    catch (e) {
        console.log('Unable to set slackUrl configuration value');
        throw e;
    }
}

async function getParam(paramName) {
    if (paramName in paramCache) {
        return paramCache[paramName];
    } else {
        try {
            const parameterStore = new AWS.SSM({ region: process.env.REGION });
            const params = {
                Name: paramName,
                WithDecryption: true
            };
            const request = await parameterStore.getParameter(params).promise();
            paramCache[paramName] = request.Parameter.Value;
            return request.Parameter.Value;
        }
        catch (e) {
            console.log(`Unable to retrieve parameter from SSM. Param Name: ${paramName}. Error: ${e}`);
        }
    }
}

module.exports = {
    config,
    init
};