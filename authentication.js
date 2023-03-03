'use strict';

const FluxxAPI = require('./fluxx_api');

const getAccessToken = async (z, bundle) => {
  //debugger;
  const options = {
    url: 'https://{{bundle.inputData.client_domain}}/oauth/token',
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'accept': 'application/json'
    },
    params: {},
    body: {
      'client_id': '{{bundle.inputData.CLIENT_ID}}',
      'client_secret': '{{bundle.inputData.CLIENT_SECRET}}',
      'grant_type': 'client_credentials'
    }
  };

  return z.request(options)
    .then((response) => {
      response.throwForStatus();
      FluxxAPI.fn.handleFluxxAPIReturnErrors(z, response);

      const results = response.data;
      // this value is bogus, but in order to use the
      // refresh token mechanism, something has to be
      // stored as refresh_token
      results.refresh_token = "bogus"; //response.access_token;
  
      // You can do any parsing you need for results here before returning them
  
      return results;
    });
};

const refreshAccessToken = async (z, bundle) => {
  //debugger;
  const options = {
    url: 'https://{{bundle.authData.client_domain}}/oauth/token',
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'accept': 'application/json'
    },
    params: {},
    body: {
        'grant_type': 'client_credentials',
        'client_id': '{{bundle.authData.CLIENT_ID}}',
        'client_secret': '{{bundle.authData.CLIENT_SECRET}}',
    }
  };
  
  return z.request(options)
    .then((response) => {
      response.throwForStatus();
      FluxxAPI.fn.handleFluxxAPIReturnErrors(z, response);
      const results = response.data;
      
      // You can do any parsing you need for results here before returning them
      results["refresh_token"] = "placeholder so it saves something - no refresh token is actually sent from Fluxx.";
      return results;
  });
};

// This function runs before every outbound request. You can have as many as you
// need. They'll need to each be registered in your index.js file.
const includeBearerToken = (request, z, bundle) => {
  if (bundle.authData.access_token) {
    request.headers.Authorization = `Bearer ${bundle.authData.access_token}`;
  }
  return request;
};

module.exports = {
  config: {
    type: 'oauth2',
    test: {
      params: {
        cols: '["id"]',
        // client_domain: '{{bundle.authData.client_domain}}',
        per_page: '1',
      },
      headers: {
        Authorization: 'Bearer {{bundle.authData.access_token}}',
      },
      method: 'GET',
      url: 'https://{{bundle.authData.client_domain}}/api/rest/v2/fund',
    },
    oauth2Config: {
      authorizeUrl: {
        url: 'https://{{bundle.inputData.client_domain}}/oauth/authorize',
        params: {
          client_id: '{{bundle.inputData.CLIENT_ID}}',
          redirect_uri: '{{bundle.inputData.redirect_uri}}',
          response_type: 'code',
        },
      },
      getAccessToken,
      refreshAccessToken,
      autoRefresh: true,
    },
    fields: [
      {
        computed: false,
        key: 'client_domain',
        required: true,
        label: 'Fluxx client domain',
        type: 'string',
        helpText:
          "This is the domain name of the Fluxx installation.\n\ne.g. **mysite.fluxx.io**   (live site)\n\ne.g. **mysite.preprod.fluxxlabs.com**  (preprod)\n\n**Don't include https:// or any leading or trailing slashes.**",
        inputFormat: 'https://{{input}}/',
        altersDynamicFields: false,
      },
      {
        key: 'bogus',
        type: 'copy',
        helpText: 'Click [here to set up API keys on your server](https://ENTER-YOUR-FLUXX-DOMAIN-HERE/oauth/applications). You will need to edit the URL to include your Fluxx domain. You may need to follow the link twice: once to log in to Fluxx, and once to go to the API keys page.',
      },
      {
        computed: false,
        key: 'CLIENT_ID',
        required: true,
        label: 'Fluxx Application Id',
        type: 'string',
        helpText:
          "Create a application id and secret in Fluxx.",
      },
      {
        computed: false,
        key: 'CLIENT_SECRET',
        required: true,
        label: 'Fluxx Secret',
        type: 'string',
        helpText:
          "Create a application id and client secret in Fluxx.",
      }
    ],
    connectionLabel: '{{bundle.authData.client_domain}}',
  },
  befores: [includeBearerToken],
  afters: [],
};
