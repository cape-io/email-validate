import {validate} from 'email-validator';
import fetchJsonp from 'fetch-jsonp';
import startsWith from 'lodash.startswith';
import includes from 'lodash.includes';

const emailIndex = {};

export default validateEmail(apiKey, address, cb) {
  // cache
  if (emailIndex[address]) {
    return {...emailIndex[address], breakPoint: 'cache'}
  }

  const status = function(help, breakPoint = 'help') {
    const v = {
      value: address,
      breakPoint: breakPoint,
      hasErrors: true,
      suggestion: null,
      help
    };
    if (address) {
      emailIndex[address] = v;
    }
    return v;
  }

  // help.
  if (!address) {
    return status(null);
  }
  if (!includes(address, '@')) {
    return status('The email must contain an "@" symbol.');
  }
  const parts = address.split('@');
  const local = parts[0];
  if (!local) {
    return status('Please include the unique username part before the "@" symbol.');
  }
  const domain = parts[1];
  if (!domain) {
    return status('Please include a valid domain for your email.');
  }
  if (!includes(domain, '.')) {
    return status('The domain part of your email needs a tld.');
  }
  const tld = domain.split('.')[1];
  if (!(tld.length > 1)) {
    return status('The email domain tld is too short.');
  }

  // preCheck
  if (!validate(address)){
    return status('Failed RFC checks.', 'preCheck');
  }

  // console.log('checkAddress', 'mailgun', apiKey, address);
  if (!startsWith(apiKey, 'pubkey-')) {
    throw new Error('apiKey must be a mailgun public key!');
  }

  const mailgun = 'https://api.mailgun.net/v3/address/validate';
  const qs = `?api_key=${apiKey}&address=${address}`;

  const triggerCb = function(v){
    if (address) {
      emailIndex[address] = v;
    }
    cb(v);
  }

  fetchJsonp(mailgun+qs, {timeout: 1351})
  .then(function(response) {
    return response.json();
  })
  .then((data) => {
    const suggestion = data.did_you_mean;
    const hasErrors = !data.is_valid;
    const help = 'Failed DNS validation or the Email Service Provider could not validate the address.';
    return triggerCb({
      value: address,
      breakPoint: 'async',
      hasErrors: hasErrors,
      help: hasErrors ? help : 'This email address looks valid.',
      suggestion: suggestion
    })
  })
  .catch(function(ex) {
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
    })
  });
  return {
    value: address,
    breakPoint: 'preCheck',
    hasErrors: false,
    help: 'Checking DNS and ESP...'
  };
}
