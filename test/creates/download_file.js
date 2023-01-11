'use_strict';

require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

describe('Create - file_download', () => {
  zapier.tools.env.inject();

  it('should create an object', async () => {
    const bundle = {
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },

      inputData: {
        id: 6833440, //9333391,
      },
    };

    const result = await appTester(
      App.creates['file_download'].operation.perform,
      bundle
    );
    result.should.not.be.an.Array();
  });
});
