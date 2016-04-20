'use strict';
var _ = require('lodash');
var P = require('bluebird');

function IntercomConversationsGetter(Implementation, params, opts) {
  var userModel = null;
  var Intercom = opts.integrations.intercom.intercom;
  var intercom = new Intercom.Client(opts.integrations.intercom.appId,
    opts.integrations.intercom.apiKey).usePromises();

  function hasPagination() {
    return params.page && params.page.number;
  }

  function getLimit() {
    return 5;
  }

  function getSkip() {
    if (hasPagination()) {
      return (parseInt(params.page.number) - 1) * getLimit();
    } else {
      return 0;
    }
  }

  function getLink(conversation) {
    return 'https://api.intercom.io/a/apps/' +
      opts.integrations.intercom.appId + '/inbox/all/conversations/' +
      conversation.id;
  }


  function fetchPages(pages, conversations) {
    return intercom
      .nextPage(pages)
      .then(function (response) {
        conversations = conversations.concat(response.body.conversations);

        if (response.body.pages.next) {
          return fetchPages(response.pages);
        } else {
          return conversations;
        }
      });
  }

  this.perform = function () {
    var userCollectionName = opts.integrations.intercom.userCollection;
    userModel = opts.mongoose.model(userCollectionName);

    return Implementation.Intercom.getCustomer(userModel, params.recordId)
      .then(function (customer) {
        return intercom.conversations
          .list({
            email: customer.email,
            type: 'user',
            'display_as': 'plaintext'
          })
          .then(function (response) {
            var conversations = response.body.conversations;

            if (response.body.pages.next) {
              return fetchPages(response.body.pages, conversations);
            } else {
              return conversations;
            }
          })
          .then(function (conversations) {
            return [conversations.length,
              conversations.slice(getSkip(), getSkip() + getLimit())];
          })
          .spread(function (count, conversations) {
            return intercom.admins.list()
              .then(function (response) {
                var admins = response.body.admins;

                return P
                  .map(conversations, function (conversation) {
                    if (conversation.assignee.type === 'admin') {
                      var adminId = parseInt(conversation.assignee.id);
                      var admin = _.find(admins, { id: adminId });

                      conversation.assignee = admin;
                    }

                    conversation.link = getLink(conversation);
                    return conversation;
                  })
                  .then(function (conversations) {
                    return [count, conversations];
                  });
              });
          })
          .catch(function () {
            return [0, []];
          });
      });
  };
}

module.exports = IntercomConversationsGetter;