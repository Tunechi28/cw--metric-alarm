const rp = require('request-promise');
const logger = require('../logger').log;

const post = async function(alarm, slackUrl) {
    try {
        const options = {
            method: 'POST',
            uri: slackUrl,
            body: JSON.stringify(buildPayload(alarm)),
            encoding: 'utf8'
        };

        return rp(options)
            .then( () => {
                logger.info('Slack notification complete');
                return;
            })
            .catch( function(err) {
                logger.error(`Slack notification error occurred: ${err}`);
                return;
            });
    } catch (e) {
        logger.error(`Slack POST error: ${e}`);
        return Promise.reject();
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