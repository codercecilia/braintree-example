'use strict';

// nitty gritty //
var express = require('express');
var braintree = require('braintree');
var router = express.Router(); // eslint-disable-line new-cap
var gateway = require('../lib/gateway');

// var TRANSACTION_SUCCESS_STATUSES = [
//   braintree.Transaction.Status.Authorizing,
//   braintree.Transaction.Status.Authorized,
//   braintree.Transaction.Status.Settled,
//   braintree.Transaction.Status.Settling,
//   braintree.Transaction.Status.SettlementConfirmed,
//   braintree.Transaction.Status.SettlementPending,
//   braintree.Transaction.Status.SubmittedForSettlement
// ];

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

// function createResultObject(transaction) {
function createResultObject(subscription) {
  var result;
  // var status = transaction.status;

  // if (TRANSACTION_SUCCESS_STATUSES.indexOf(status) !== -1) {
  var status = subscription.status;

  if (SUBSCRIPTION_SUCCESS_STATUSES.indexOf(status) !== -1) {
    result = {
      header: 'Welcome to Coder Kids!',
      icon: 'success',
      message: 'Your membership enrollment is now complete. You should receive an email with membership details and instructions on scheduling your Coderkid. Please review membership details and contact us at info@coder-kids.com with any questions. '
    };
  } else {
    result = {
      header: 'Transaction Failed',
      icon: 'fail',
      message: 'There is an issue with this transaction. Please contact us at info@coder-kids.com.'
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
  // var transactionId = req.params.id;
  // gateway.transaction.find(transactionId, function (err, transaction) {
  //   result = createResultObject(transaction);
  //   res.render('checkouts/show', {transaction: transaction, result: result});
  // });
  var subscriptionId = req.params.id;
  gateway.subscription.find(subscriptionId, function (err, subscription) {
    result = createResultObject(subscription);
    res.render('checkouts/show', {subscription: subscription, result: result});
  });
});

router.post('/checkouts', function (req, res) {
  var transactionErrors;
  // var amount = req.body.amount; // In production you should not take amounts directly from clients
  var firstName: req.body.firstName;
  var nonce = req.body.payment_method_nonce;
  var startDate = new Date(Date.UTC(2016, 8, 6, 0, 0, 0));

  gateway.customer.create({
  paymentMethodNonce: nonce,
  firstName: firstName,
  lastName: "Ramirez",
  customFields: {
    initialcourse: "Introduction to Scratch",
    childage: "8",
    childlastname: "Ramirez",
    childfirstname: "Isabella"  
  }
  }, function (err, result) {
    if (result.success) {
      var token = result.customer.paymentMethods[0].token;
      gateway.subscription.create({
        paymentMethodToken: token,
        planId: "four_month_membership_id",
        firstBillingDate: startDate
      }, function (err, result) {
          if (result.success || result.subscription) {
            res.redirect('checkouts/' + result.subscription.id);
        } else {
            transactionErrors = result.errors.deepErrors();
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
