'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _emailValidator = require('email-validator');

var _fetchJsonp = require('fetch-jsonp');

var _fetchJsonp2 = _interopRequireDefault(_fetchJsonp);

var _lodashStartswith = require('lodash.startswith');

var _lodashStartswith2 = _interopRequireDefault(_lodashStartswith);

var _lodashIncludes = require('lodash.includes');

var _lodashIncludes2 = _interopRequireDefault(_lodashIncludes);

var emailIndex = {};

exports['default'] = function (apiKey, address, cb) {
  // cache
  if (emailIndex[address]) {
    return _extends({}, emailIndex[address], { breakPoint: 'cache' });
  }

  var status = function status(help) {
    var breakPoint = arguments.length <= 1 || arguments[1] === undefined ? 'help' : arguments[1];

    var v = {
      value: address,
      breakPoint: breakPoint,
      hasErrors: true,
      suggestion: null,
      help: help
    };
    if (address) {
      emailIndex[address] = v;
    }
    return v;
  };

  // help.
  if (!address) {
    return status(null);
  }
  if (!(0, _lodashIncludes2['default'])(address, '@')) {
    return status('The email must contain an "@" symbol.');
  }
  var parts = address.split('@');
  var local = parts[0];
  if (!local) {
    return status('Please include the unique username part before the "@" symbol.');
  }
  var domain = parts[1];
  if (!domain) {
    return status('Please include a valid domain for your email.');
  }
  if (!(0, _lodashIncludes2['default'])(domain, '.')) {
    return status('The domain part of your email needs a tld.');
  }
  var tld = domain.split('.')[1];
  if (!(tld.length > 1)) {
    return status('The email domain tld is too short.');
  }

  // preCheck
  if (!(0, _emailValidator.validate)(address)) {
    return status('Failed RFC checks.', 'preCheck');
  }

  // console.log('checkAddress', 'mailgun', apiKey, address);
  if (!(0, _lodashStartswith2['default'])(apiKey, 'pubkey-')) {
    throw new Error('apiKey must be a mailgun public key!');
  }

  var mailgun = 'https://api.mailgun.net/v3/address/validate';
  var qs = '?api_key=' + apiKey + '&address=' + address;

  var triggerCb = function triggerCb(v) {
    if (address) {
      emailIndex[address] = v;
    }
    cb(v);
  };

  (0, _fetchJsonp2['default'])(mailgun + qs, { timeout: 1351 }).then(function (response) {
    return response.json();
  }).then(function (data) {
    var suggestion = data.did_you_mean;
    var hasErrors = !data.is_valid;
    var help = 'Failed DNS validation or the Email Service Provider could not validate the address.';
    return triggerCb({
      value: address,
      breakPoint: 'async',
      hasErrors: hasErrors,
      help: hasErrors ? help : 'This email address looks valid.',
      suggestion: suggestion
    });
  })['catch'](function (ex) {
    console.log('validateEmail failed', address, ex);
    if (!navigator.onLine) {
      alert('Please check your internet connection. It looks like you are disconnected.');
    }
    // Try another API? kickbox.io / mailboxlayer.com
    triggerCb({
      value: address,
      breakPoint: 'async-error',
      hasErrors: false,
      help: 'Looks valid. We were not able to do DNS or SMTP checking.',
      suggestion: null
    });
  });
  return {
    value: address,
    breakPoint: 'preCheck',
    hasErrors: false,
    help: 'Checking DNS and ESP...'
  };
};

module.exports = exports['default'];

