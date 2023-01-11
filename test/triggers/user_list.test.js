'use_strict';

/* globals describe, expect, test, it */

const zapier = require('zapier-platform-core');

// Use this to make test calls into your app:
const App = require('../../index');
const appTester = zapier.createAppTester(App);
// read the `.env` file into the environment, if available
zapier.tools.env.inject();

describe('triggers.user_list', () => {
  it('should run', async () => {
    const bundle = { 
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },

      inputData: {
        name_segment: "Stephen",
      },
    };

    const results = await appTester(App.triggers.user_list.operation.perform, bundle);
    expect(results).toBeDefined();
    // TODO: add more assertions
  });
});
