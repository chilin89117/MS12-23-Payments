const {body} = require('express-validator/check');

module.exports = [
  body('email', 'Email address format is not valid')
    .isEmail()
    .normalizeEmail(),
  body('password', 'Password must be 6 to 20 characters long')
    .isLength({min: 6, max: 20})
    .trim()
];
