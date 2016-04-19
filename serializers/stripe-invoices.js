'use strict';
var _ = require('lodash');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var Schemas = require('../generators/schemas');

function StripeInvoicesSerializer(invoices, customerCollectionName, meta) {
  function getCustomerAttributes() {
    if (!invoices.length) { return []; }

    var schema = Schemas.schemas[customerCollectionName];
    if (!schema) { return []; }
    return _.map(schema.fields, 'field');
  }

  var customerAttributes = getCustomerAttributes();

  invoices = invoices.map(function (invoice) {
    // jshint camelcase: false
    invoice.date =  new Date(invoice.date * 1000);

    if (invoice.period_start) {
      invoice.period_start =  new Date(invoice.period_start * 1000);
    }

    if (invoice.period_end) {
      invoice.period_end =  new Date(invoice.period_end * 1000);
    }

    if (invoice.subtotal) { invoice.subtotal /= 100; }
    if (invoice.total) { invoice.total /= 100; }

    return invoice;
  });

  return new JSONAPISerializer('stripe-invoices', invoices, {
    attributes: ['amount_due', 'attempt_count', 'attempted', 'closed',
      'currency', 'date', 'forgiven', 'paid', 'period_start', 'period_end',
      'subtotal', 'total', 'application_fee', 'tax', 'tax_percent',
      'customer'],
    customer: {
      ref: Schemas.schemas[customerCollectionName].idField,
      attributes: customerAttributes
    },
    keyForAttribute: function (key) { return key; },
    typeForAttribute: function (attr) {
      if (attr === 'customer') { return customerCollectionName; }
      return attr;
    },
    meta: meta
  });
}

module.exports = StripeInvoicesSerializer;

