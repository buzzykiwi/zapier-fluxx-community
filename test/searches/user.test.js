'use_strict';

/* globals describe, expect, test, it */

const zapier = require('zapier-platform-core');

// Use this to make test calls into your app:
const App = require('../../index');
const appTester = zapier.createAppTester(App);
// read the `.env` file into the environment, if available
zapier.tools.env.inject();

describe('searches.find_user', () => {
  it('should run', async () => {
    const bundle = { 
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },
      inputData: {
        name: "Stephen Brandon",
      },
     };

    const results = await appTester(App.searches.find_user.operation.perform, bundle);
    expect(results).toBeDefined();
    // TODO: add more assertions
  });
});
