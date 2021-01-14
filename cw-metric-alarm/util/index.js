const AWS = require('aws-sdk');
AWS.config.update({ region: process.env.REGION });

async function getAlarmLevel(description) {
    let alarmLevel = 'Warning';
    const regex = /.*(warning|critical).*/gi;
    const result = regex.exec(description);
    if (result) {
        alarmLevel = result[1];
    }

    return alarmLevel;
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
        case 'domain-controller':
            return ':domain-controller: Domain Controller';
        case 'utility':
            return ':hammer_and_wrench: Utility Server';
        case 'demo':
            return ':demo: Demo Server';
        default:
            return '';
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

module.exports = {
    getAlarmLevel,
    lookupInstanceRole,
    lookupTagValue,
    simplifyComparisonOperator
};