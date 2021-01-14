const expect  = require('chai').expect;
const util = require('../util');

describe('Util tests', () => {
    it('returns Alarm Level when description contains Warning', async () => {
        //Arrange
        const input = 'Warning! Something is wrong';

        //Act
        const result = await util.getAlarmLevel(input);

        //Assert
        expect(result).to.equal('Warning');
    });

    it('returns Alarm Level when description contains Critical', async () => {
        //Arrange
        const input = 'Critical! Something is really wrong';

        //Act
        const result = await util.getAlarmLevel(input);

        //Assert
        expect(result).to.equal('Critical');
    });

    it('returns Alarm Level equal to Warning when description is not clear', async () => {
        //Arrange
        const input = '';

        //Act
        const result = await util.getAlarmLevel(input);

        //Assert
        expect(result).to.equal('Warning');
    });
});
