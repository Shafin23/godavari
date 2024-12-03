const crypto = require('crypto');

const generatingBookingID = () => {
    return crypto.randomBytes(6).toString('hex').toUpperCase();
}
module.exports = { generatingBookingID }