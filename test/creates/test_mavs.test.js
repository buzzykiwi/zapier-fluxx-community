'use_strict';

/* globals describe, expect, test, it */

const zapier = require('zapier-platform-core');

// Use this to make test calls into your app:
const App = require('../../index');
const appTester = zapier.createAppTester(App);
// read the `.env` file into the environment, if available
zapier.tools.env.inject();

describe('creates.test_mavs', () => {
  it('should run', async () => {
    const bundle = { 
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },
      inputData: {
        model_type: "GrantRequest",
        field_name: "funding_sector",
        test_path: "#07: Law, advocacy and politics#07 100: Civic and advocacy organisations",
        test_expected_id: 9285828,
      },
     };

    const results = await appTester(App.creates.test_mavs.operation.perform, bundle);
    expect(results).toBeDefined();
    // TODO: add more assertions
  });
});
