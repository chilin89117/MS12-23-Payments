const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {validationResult} = require('express-validator/check');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// use 'mailtrap.io' (see '/.env' file)
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS
  }
});

exports.getLogin = (req, res, next) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'MS12-23-Payments Login',
    isLoggedIn: req.session.isLoggedIn,
    valErrs: [],
    flashMsg: req.flash(),
    oldInputs: {email: '', password: ''}
  });
};

exports.postLogin = (req, res, next) => {
  const {email, password} = req.body;
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res
      .status(422)
      .render('auth/login', {
        path: '/signup',
        pageTitle: 'MS12-23-Payments Login',
        isLoggedIn: false,
        valErrs: errors.array(),
        flashMsg: req.flash(),
        oldInputs: {email, password}
      });
  }
  let userInDb;
  User
    .findOne({email})
    .then(user => {
      if(!user) return Promise.resolve(false);          // email not found, resolve to false
      userInDb = user;
      return bcrypt.compare(password, user.password);   // compare encrypted passwords
    })
    .then(result => {                                   // 'result' is either 'true' or 'false'
      if(!result) {
        req.flash('error', 'Invalid credentials. Please try again.');
        res
          .status(422)
          .render('auth/login', {
            path: '/signup',
            pageTitle: 'MS12-23-Payments Login',
            isLoggedIn: false,
            valErrs: errors.array(),
            flashMsg: req.flash(),
            oldInputs: {email, password}
          });
      } else {
        req.session.user = userInDb;                    // save logged in user's session
        req.session.isLoggedIn = true;
        req.session.save(err => {                       // save session before redirecting
          if(err) console.log(err);
          req.flash('success', `Welcome back, ${req.session.user.name}!`);
          res.redirect('/');
        });
      }
    })
    .catch(err => next(err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    if(err) console.log(err);
    res.redirect('/');
  });
};

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'MS12-23-Payments Signup',
    isLoggedIn: false,
    valErrs: [],
    flashMsg: req.flash(),
    oldInputs: {name: '', email: '', password: ''}
  });
};

exports.postSignup = (req, res, next) => {
  const {name, email, password} = req.body;
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res
      .status(422)
      .render('auth/signup', {
        path: '/signup',
        pageTitle: 'MS12-23-Payments Signup',
        isLoggedIn: false,
        valErrs: errors.array(),
        flashMsg: req.flash(),
        oldInputs: {name, email, password}
      });
  }
  bcrypt
    .hash(password, 12)
    .then(result => {
      const newUser = new User({name, email, password: result, cart: {items: []}});
      return newUser.save();  // returns user object
    })
    .then(result => {
      if(result.email) {
        const mailOptions = {
          to: email,
          from: process.env.ADMIN_EMAIL,
          subject: 'MS12-23-Payments Signup',
          html: `
            <h1>Hello ${name}, welcome to MS12-23-Payments!</h1>
            <h3>Your signup is complete!</h3>
            <p>Click <a href="http://localhost:3000/login">here</a> to login.</p>
          `
        };
        return transporter.sendMail(mailOptions);
      }
      else return Promise.resolve('Signup failed. Please try again.');
    })
    .then(result => {
      if(result.accepted.length > 0) {
        req.flash('success', 'Signup successful. Check your email for welcoming message. Please login.');
        res.redirect('/login');
      } else if(result.accepted.length === 0) {
        req.flash('success', 'Signup successful (but failed to send welcome email). Please login.');
        res.redirect('/login');
      } else {
        req.flash('error', 'Signup failed. Please try again.');
        res.redirect('/signup');
      }
    })
    .catch(err => next(err));
};

// show form to enter email for resetting password
exports.getReset = (req, res, next) => {
  res.render('auth/reset', {
    path: 'reset',
    pageTitle: 'MS12-23-Payments Reset Password',
    flashMsg: req.flash()
  });
};

// if email is valid, create token and send email with link to reset password
exports.postReset = (req, res, next) => {
  const buf = crypto.randomBytes(32);     // synchronous operation
  const token = buf.toString('hex');
  User
    .findOne({email: req.body.email})
    .then(user => {
      if(!user) return Promise.resolve(null);   // no such email
      user.passwordResetToken = token;
      user.passwordResetTokenExpiration = Date.now() + 3600000;   // token expires in 1 hour
      return user.save();                 // save token info to database
    })
    .then(user => {
      if(!user) return Promise.resolve(null);
      else {
        const mailOptions = {
          to: user.email,
          from: process.env.ADMIN_EMAIL,
          subject: 'MS12-23-Payments Reset Password',
          html: `
            <h1>Hello ${user.name},</h1>
            <h3>You requested a password reset.</h3>
            <p>Click <a href="http://localhost:3000/newpwd/${token}">here</a> to set new password.</p>
          `
        };
        return transporter.sendMail(mailOptions);
      }
    })
    .then(result => {
      if(!result) {
        req.flash('error', 'No such email in database. Please try again.');
        res.redirect('/reset');
      } else if(result.accepted.length > 0) {
        req.flash('info', 'Please check your email with link to change password.');
        res.redirect('/login');
      } else if(result.accepted.length === 0) {
        req.flash('error', 'Failed to send email. Please try again.');
        res.redirect('/reset');
      } else {
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/reset');
      }
    })
    .catch(err => next(err));
};

// show password reset form only if a valid token is sent from email link
exports.getNewPwd = (req, res, next) => {
  const token = req.params.token;
  User
    .findOne({passwordResetToken: token, passwordResetTokenExpiration: {$gt: Date.now()}})
    .then(user => {
      if(!user) {
        req.flash('error', 'Invalid token. Please try again.');
        res.redirect('/login');
      } else {
        res.render('auth/newpwd', {
          path: 'reset',
          pageTitle: 'MS12-23-Payments Update Password',
          flashMsg: req.flash(),
          user_id: user._id,      // need user's id to pass to 'postNewPwd' route
          token
        });
      }
    })
    .catch(err => next(err));
}

// update user password and clear out token fields
exports.postNewPwd = (req, res, next) => {
  const {password, confirmpassword, id, token} = req.body;
  if(password !== confirmpassword) {
    req.flash('error', 'Passwords do not match. Please try again.');
    return res.redirect(`/newpwd/${token}`);
  }
  let user;
  User
    .findOne({_id: id, passwordResetToken: token, passwordResetTokenExpiration: {$gt: Date.now()}})
    .then(usr => {
      user = usr;
      return bcrypt.hash(password, 12);
    })
    .then(hashedPwd => {
      user.password = hashedPwd;
      user.passwordResetToken = null;
      user.passwordResetTokenExpiration = null;
      return user.save();
    })
    .then(user => {
      req.flash('success', 'Password successfully updated.');
      res.redirect('/login');
    })
    .catch(err => next(err));
};

// Sample output from 'transporter.sendMail()'
// { accepted: ['tiff@example.com'],
//   rejected: [],
//   envelopeTime: 247,
//   messageTime: 205,
//   messageSize: 497,
//   response: '250 2.0.0 Ok: queued',
//   envelope: {from: 'admin@ms12-23-payments.com', to: ['tiff@example.com']},
//   messageId: '<ccae1bda-863c-cef4-63a7-c12ea28c61c5@ms12-23-payments.com>'
// }
