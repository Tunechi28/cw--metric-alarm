const got = require('got');
const logger = require('../logger').log;
const config = require('../config').config;

const post = async function(alarm) {
    try {
        const options = {
            method: 'POST',
            body: JSON.stringify(buildPayload(alarm)),
            encoding: 'utf8'
        };

        await got(config.slackUrl, options);
        logger.info('Slack POST complete');
    } catch (error) {
        logger.error(`Slack POST error: ${error}`);
        return error;
    }
};

// Translates JSON results into a format
// which can be interpreted by Slack
const buildPayload = function(alarm) {
    const payload = {
        'response_type': 'in_channel',
        'blocks': [
            {
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': `*[${alarm.alarmLevel}] A CloudWatch alarm has been triggered*`
                }
            }
        ]
    };

    if (alarm.alarmType === 'DMS') {
        payload.blocks.push({
            'type': 'section',
            'fields': [
                {
                    'type': 'mrkdwn',
                    'text': `*Type:*\n${alarm.alarmType}`
                },{
                    'type': 'mrkdwn',
                    'text': `*EventId:*\n${alarm.dmsEventId}`
                },
                {
                    'type': 'mrkdwn',
                    'text': `*TaskId:*\n${alarm.dmsTaskId}`
                },
                {
                    'type': 'mrkdwn',
                    'text': `*Region:*\n${alarm.region}`
                }
            ]
        });
    } else if (alarm.alarmType === 'EC2') {
        //EC2 alarm type
        payload.blocks.push({
            'type': 'section',
            'fields': [
                {
                    'type': 'mrkdwn',
                    'text': `*Name:*\n${alarm.name}`
                },{
                    'type': 'mrkdwn',
                    'text': `*InstanceId:*\n${alarm.instanceId}`
                },
                {
                    'type': 'mrkdwn',
                    'text': `*Instance Name:*\n${alarm.instanceName}`
                },
                {
                    'type': 'mrkdwn',
                    'text': `*Description:*\n${alarm.description}`
                },
                {
                    'type': 'mrkdwn',
                    'text': `*Region:*\n${alarm.region}`
                },
                {
                    'type': 'mrkdwn',
                    'text': `*Role:*\n${alarm.instanceRole}`
                }
            ]
        });
    } else {
        //General alarm type
        payload.blocks.push({
            'type': 'section',
            'fields': [
                {
                    'type': 'mrkdwn',
                    'text': `*Name:*\n${alarm.name}`
                },
                {
                    'type': 'mrkdwn',
                    'text': `*Description:*\n${alarm.description}`
                },
                {
                    'type': 'mrkdwn',
                    'text': `*Region:*\n${alarm.region}`
                },
                {
                    'type': 'mrkdwn',
                    'text': `*Namespace:*\n${alarm.namespace}`
                },
                {
                    'type': 'mrkdwn',
                    'text': `*MetricName:*\n${alarm.metric}`
                },
                {
                    'type': 'mrkdwn',
                    'text': `*Threshold:*\n${alarm.threshold}`
                }
            ]
        });
    }

    if (alarm.alarmType !== 'General') {
        payload.blocks.push({
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': `*Reason:* ${alarm.alarmNarrative}`
            }
        });
    }

    return payload;
};

module.exports = {
    post
};