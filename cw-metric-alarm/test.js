const config = require('./config');
const bot = require('./index');

(async () => {
    //Test message for an AWS DMS alert
    const event = {
        Records: [
            {
                EventSource: 'aws:sns',
                EventVersion: '1.0',
                EventSubscriptionArn: 'arn:aws:sns:us-east-1:588237033746:bt-test:c87642b6-0d1b-4028-ad1d-189a1664c728',
                Sns: {
                    Message: {'Event Source':'replication-task','Event Time':'2020-09-18 02:30:47.992','Identifier Link':'https://console.aws.amazon.com/dms/home?region=us-east-1#tasks:ids=test\nSourceId: test ','Event ID':'http://docs.aws.amazon.com/dms/latest/userguide/CHAP_Events.html#DMS-EVENT-0078 ','Event Message':'Replication task has failed.\nReason: Last Error  Stream Component Fatal error.\nTask error notification received from subtask 0, thread 0 [reptask/replicationtask.c:2801] [1020101]\nMS-CDC has not been enabled on database \'source\'; Failed while preparing stream component \'st_0_ZWM3PVTJOKDA4ACT6IXXGG6NETBAEDS5BM3LVAY\'.; Cannot initialize subtask; Stream component \'st_0_ZWM3PVTJOKDA4ACT6IXXGG6NETBAEDS5BM3LVAY\' terminated [reptask/replicationtask.c:2808] [1020101]n Stop Reason FATAL_ERROR Error Level FATAL.'}
                }
            }
        ]
    };

    const context = {
    };

    await bot.handler(event, context, function(result, message) {
        console.log(`Complete. Message: ${message}`);
    });
})();
