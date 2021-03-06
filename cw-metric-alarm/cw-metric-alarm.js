const slack = require('./slack');
const logger = require('./logger').log;
const config = require('./config');
const util = require('./util');

function handler(event, context, callback) {
    (async () => {
        try {
            await config.init();

            //Receive message from SNS topic
            const message = event.Records[0].Sns.Message;
            logger.info(message);

            //Extract alarm details
            const alarm = await parseAlarm(JSON.parse(message));

            //Post to Slack
            await slack.post(alarm);
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
    } else if (config.config.ec2AlarmNamespace.includes(alarm.Trigger.Namespace)) {
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

    const operator = await util.simplifyComparisonOperator(alarm.Trigger.ComparisonOperator);

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
        alarmLevel: await util.getAlarmLevel(alarm.AlarmDescription),
        alarmNarrative: alarmNarrative,
        instanceName: await util.lookupTagValue(instanceId, 'Name'),
        instanceRole: await util.lookupInstanceRole(instanceId)
    };
}

async function parseGeneralAlarm(alarm) {
    logger.info('Alarm Type: General');

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
        alarmLevel: await util.getAlarmLevel(alarm.AlarmDescription),
        namespace: alarm.Trigger.Namespace
    };
}

module.exports = {
    handler
};