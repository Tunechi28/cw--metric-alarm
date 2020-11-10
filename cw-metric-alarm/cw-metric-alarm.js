const AWS = require('aws-sdk');
AWS.config.update({ region: process.env.REGION });
const slack = require('./slack');
const logger = require('./logger').log;
const config = require('./config');
const paramCache = {};

function handler(event, context, callback) {
    (async () => {
        try {
            //Receive message from SNS topic
            const message = event.Records[0].Sns.Message;
            logger.info(message);

            //Extract alarm details
            const alarm = await parseAlarm(JSON.parse(message));

            //Post to Slack
            const slackUrl = await getParam(process.env.SLACKURLPARAM);
            await slack.post(alarm, slackUrl);
        } catch (e) {
            logger.error(`Exception caught in handler: ${e}`);
            callback(error);
        }
    })();
}

async function parseAlarm(alarm) {
    if (alarm['Event Source'] === 'replication-task') {
        //This is a DMS Alarm
        return await parseDMSAlarm(alarm);
    } else if (config.ec2AlarmNamespace.includes(alarm.Trigger.Namespace)) {
        //This is an EC2 alarm (CPU, Disk, Instance State)
        return await parseEC2Alarm(alarm);
    }
    else {
        return await parseGeneralAlarm(alarm);
    }
}

async function parseDMSAlarm(alarm) {
    logger.info('Alarm Type: DMS');

    const identifierLink = alarm['Identifier Link'];

    const region = identifierLink.match('(?<=region=)[^#]+')[0];

    const dmsEventId = alarm['Event ID'].match('(?<=#)[^\\s]+')[0];

    const alarmNarrative = alarm['Event Message'];

    const dmsTaskId = identifierLink.match('(?<=ids=)[^\\n]+')[0];

    return {
        alarmType: 'DMS',
        region,
        dmsEventId,
        dmsTaskId,
        alarmNarrative,
        alarmLevel: alarmNarrative.includes('RECOVERABLE_ERROR') ? 'WARN' : 'Critical'
    };
}

async function parseEC2Alarm(alarm) {
    logger.info('Alarm Type: EC2');

    const instanceId = alarm.Trigger.Dimensions.find(o => o.name === 'InstanceId').value;

    let alarmLevel = '';
    const regex = /.*(warning|critical).*/gi;
    const result = regex.exec(alarm.AlarmDescription);
    if (result) {
        alarmLevel = result[1];
    }

    const operator = await simplifyComparisonOperator(alarm.Trigger.ComparisonOperator);

    let alarmNarrative = '';
    if (alarm.Trigger.MetricName === 'LogicalDisk % Free Space') {
        const driveLetter = alarm.Trigger.Dimensions.find(o => o.name === 'instance');
        let drive = '';
        if (driveLetter) {
            drive = driveLetter.value;
        }
        alarmNarrative = `:disk: Space on drive ${drive} is ${operator} ${alarm.Trigger.Threshold}%`;
    }
    else if (alarm.Trigger.MetricName === 'StatusCheckFailed') {
        alarmNarrative = ':stop_sign: An instance or system status check has failed. This could mean the instance is unreachable.';
    }
    else if (alarm.Trigger.MetricName === 'CPUUtilization') {
        alarmNarrative = `:cpu: CPU Utilization is ${operator} ${alarm.Trigger.Threshold}%`;
    }
    else if (alarm.Trigger.MetricName === 'Memory % Committed Bytes In Use') {
        alarmNarrative = `:memory: Memory Utilization is ${operator} ${alarm.Trigger.Threshold}%`;
    }

    return {
        alarmType: 'EC2',
        name: alarm.AlarmName,
        accountId: alarm.AWSAccountId,
        description: alarm.AlarmDescription,
        region: alarm.Region,
        metric: alarm.Trigger.MetricName,
        statistic: alarm.Trigger.Statistic,
        period: alarm.Trigger.Period,
        threshold: alarm.Trigger.Threshold,
        reason: alarm.NewStateReason,
        instanceId,
        alarmLevel: alarmLevel,
        alarmNarrative: alarmNarrative,
        instanceName: await lookupTagValue(instanceId, 'Name'),
        instanceRole: await lookupInstanceRole(instanceId)
    };
}

async function parseGeneralAlarm(alarm) {
    logger.info('Alarm Type: General');

    let alarmLevel = '';
    const regex = /.*(warning|critical).*/gi;
    const result = regex.exec(alarm.AlarmDescription);
    if (result) {
        alarmLevel = result[1];
    }

    return {
        alarmType: 'General',
        name: alarm.AlarmName,
        accountId: alarm.AWSAccountId,
        description: alarm.AlarmDescription,
        region: alarm.Region,
        metric: alarm.Trigger.MetricName,
        statistic: alarm.Trigger.Statistic,
        period: alarm.Trigger.Period,
        threshold: alarm.Trigger.Threshold,
        reason: alarm.NewStateReason,
        alarmLevel: alarmLevel,
        namespace: alarm.Trigger.Namespace
    };
}

//TODO: This should be moved to the config module
async function getParam(paramName) {
    if (paramName in paramCache) {
        logger.info(`${paramName} found in cache.`);
        return paramCache[paramName];
    } else {
        logger.info(`${paramName} not found in cache. Getting value from Parameter Store.`);
        try {
            const parameterStore = new AWS.SSM({ region: process.env.REGION });
            const params = {
                Name: paramName,
                WithDecryption: true
            };
            const request = await parameterStore.getParameter(params).promise();
            logger.info('Updating cache with value from Parameter Store.');
            paramCache[paramName] = request.Parameter.Value;
            return request.Parameter.Value;
        }
        catch (e) {
            logger.error(`Unable to retrieve parameter from SSM. Param Name: ${paramName}. Error: ${e}`);
        }
    }
}

async function lookupInstanceRole(instanceId) {
    const instanceRole = await lookupTagValue(instanceId, 'Type');

    switch (instanceRole) {
        case 'vip_imosapp':
            return ':imosapp: IMOS App';
        case 'vip_imosmsg':
            return ':imosmsg: IMOS Msg';
        case 'sqlserver':
            return ':sqlserver: SQL Server';
        case 'vip_web':
            return ':iis: IIS';
        default:
            return '';
    }
}

async function lookupTagValue(instanceId, tag) {
    try {
        const ec2 = new AWS.EC2();
        const params = {
            InstanceIds: [
                instanceId
            ]
        };
        const result = await ec2.describeInstances(params).promise();
        return result.Reservations[0].Instances[0] !== null ? result.Reservations[0].Instances[0].Tags.find(x => x.Key === tag).Value : 'Unknown';
    } catch (e) {
        logger.error(`Unable to retrieve value for tag: ${tag}. Error: ${e}`);
        return 'Unknown';
    }
}

async function simplifyComparisonOperator(operator) {
    switch (operator) {
        case 'GreaterThanOrEqualToThreshold':
            result = '>=';
            break;
        case 'GreaterThanThreshold':
            result = '>';
            break;
        case 'LessThanThreshold':
            result = '<';
            break;
        case 'LessThanOrEqualToThreshold':
            result = '<=';
            break;
        default:
            result = operator;
    }
    return result;
}

module.exports = {
    handler
};