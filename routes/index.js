'use strict';

var express = require('express');
var braintree = require('braintree');
var router = express.Router(); // eslint-disable-line new-cap
var gateway = require('../lib/gateway');

  var SUBSCRIPTION_SUCCESS_STATUSES = [
    braintree.Subscription.Status.Active,
    braintree.Subscription.Status.Canceled,
    braintree.Subscription.Status.Expired,
    braintree.Subscription.Status.PastDue,
    braintree.Subscription.Status.Pending
   ];

function formatErrors(errors) {
  var formattedErrors = '';

  for (var i in errors) { // eslint-disable-line no-inner-declarations, vars-on-top
    if (errors.hasOwnProperty(i)) {
      formattedErrors += 'Error: ' + errors[i].code + ': ' + errors[i].message + '\n';
    }
  }
  return formattedErrors;
}

function createResultObject(subscription) {
  var result;
  var status = subscription.status;

  if (SUBSCRIPTION_SUCCESS_STATUSES.indexOf(status) !== -1) {
    result = {
      header: 'Welcome to Coder Kids!',
      icon: 'success',
      message: 'Your membership enrollment is now complete. Please review membership details and contact us at hello@coder-kids.com with any questions. Once you have reviewed your membership details, click the button below to schedule your CoderKid.'
    };
  } else {
    result = {
      header: 'Transaction Failed',
      icon: 'fail',
      message: 'There is an issue with this transaction. Please contact us at hello@coder-kids.com.'
    };
  }

  return result;
}

router.get('/', function (req, res) {
  res.redirect('/checkouts/new');
});

router.get('/checkouts/new', function (req, res) {
  gateway.clientToken.generate({}, function (err, response) {
    res.render('checkouts/new', {clientToken: response.clientToken, messages: req.flash('error')});
  });
});

router.get('/checkouts/:id', function (req, res) {
  var result;
  var subscriptionId = req.params.id;
  gateway.subscription.find(subscriptionId, function (err, subscription) {
    result = createResultObject(subscription);
    res.render('checkouts/show', {subscription: subscription, result: result});
  });
});

router.post('/checkouts', function (req, res) {
  var transactionErrors;
  var plan = req.body.selectedPlan;
  var firstName = req.body.firstName;
  var lastName = req.body.lastName;
  var email = req.body.email;
  var phoneNumber = req.body.phone;
  var referralName = req.body.referralName;
  var childFirstName = req.body.childfirstname;
  var childLastName = req.body.childlastname;
  var childAge = req.body.childage;
  var initialCourse = req.body.initialcourse;
  var nonce = req.body.payment_method_nonce;
  var startDate = new Date(Date.UTC(2016, 9, 16, 0, 0, 0));

  gateway.customer.create({
  paymentMethodNonce: nonce,
  firstName: firstName,
  lastName: lastName,
  email: email,
  phone: phoneNumber,
  customFields: {
    initialcourse: initialCourse,
    childage: childAge,
    childlastname: childLastName,
    childfirstname: childFirstName,
    referralname: referralName
  }
  }, function (err, result) {
      if (result.success) {
        var token = result.customer.paymentMethods[0].token;
        gateway.subscription.create({
          paymentMethodToken: token,
          planId: plan,
          firstBillingDate: startDate
        }, function (err, result) {
            if (result.success || result.subscription) {
              res.redirect('checkouts/' + result.subscription.id);
          } else {
              var transactionErrors = result.errors.deepErrors();
              req.flash('error', {msg: formatErrors(transactionErrors)});
              res.redirect('checkouts/new');
            }
          });
  } else {
      res.redirect('/');
    }
  });
  

  // gateway.transaction.sale({
  //   amount: amount,
  //   paymentMethodNonce: nonce
  // }, function (err, result) {
  //   if (result.success || result.transaction) {
  //     res.redirect('checkouts/' + result.transaction.id);
  //   } else {
  //     transactionErrors = result.errors.deepErrors();
  //     req.flash('error', {msg: formatErrors(transactionErrors)});
  //     res.redirect('checkouts/new');
  //   }
  // });
});

module.exports = router;
