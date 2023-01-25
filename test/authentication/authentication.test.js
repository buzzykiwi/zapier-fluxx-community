/* globals describe, it, expect, beforeAll */

const zapier = require('zapier-platform-core');

zapier.tools.env.inject(); // read from the .env file

const App = require('../../index');
const appTester = zapier.createAppTester(App);

describe('oauth2 app', () => {
  beforeAll(() => {
    // It's a good idea to store your Client ID and Secret in the environment rather than in code.
    if (!(process.env.CLIENT_ID && process.env.CLIENT_SECRET)) {
      throw new Error(
        `Before running the tests, make sure CLIENT_ID and CLIENT_SECRET are available in the environment.`
      );
    }
  });

  it('can fetch an access token', async () => {
    const bundle = {
      inputData: {
        // In production, Zapier passes along whatever code your API set in the query params when it redirects
        // the user's browser to the `redirect_uri`
        client_domain: process.env.CLIENT_DOMAIN,
        CLIENT_ID: process.env.CLIENT_ID,
        CLIENT_SECRET: process.env.CLIENT_SECRET,
      },
      environment: {
      },
      cleanedRequest: {
        querystring: {
          accountDomain: 'test-account',
          code: 'one_time_code',
        },
      },
      rawRequest: {
        querystring: '?accountDomain=test-account&code=one_time_code',
      },
    };

    const result = await appTester(
      App.authentication.oauth2Config.getAccessToken,
      bundle
    );

    expect(result.access_token.length).toBe(64);
    expect(result.refresh_token).toBe('bogus');
  });

});
