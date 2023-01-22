<h1 align="center">
  <img alt="Fluxx™ Logo" src="https://cdn2.hubspot.net/hub/485822/hubfs/FLUXX_Brand_Mark_Fullcolor_PMS_Lrg.png?width=108&height=108" width="108px">
  <br>
  Zapier Connector for Fluxx™, Community Edition 
  <br>
  <br>
</h1>

Fluxx Community Edition (FCE) is a Zapier integration that allows Zapier to connect to your [Fluxx](https://www.fluxx.io) installation, and integrate Fluxx with any of the hundreds of other web applications to which Zapier can connect.

## Table of Contents



- [Getting Started](#getting-started)
  * [Public vs Private Zapier Integrations](#public-vs-private-zapier-integrations)
  * [Use of This Software](#use-of-this-software)
  * [Setup and Authentication](#setup-and-authentication)

## Getting Started
> FCE is third-party, open source software. As it is not provided or endorsed by Fluxx, the Zapier integration is a Private rather than Public integration. i.e. you will not find FCE in Zapier's standard list of integrations. To use it, follow [this link](https://zapier.com/developer/public-invite/171896/79f0f6177294d5882a4e1eb79aa80fef/) to add it to your Zapier account.

### Public vs Private Zapier Integrations

Zapier has two levels of integrations/apps. Public integrations are "first-class citizens": the integrations go through a rigorous assessment by Zapier staff and are then listed and available for all Zapier users. In order for an integration to go public, it has to be developed by the owner of the API (Fluxx) or an authorised contractor. Third-party developers cannot make their integrations Public in this way, but they may make their Private integration available via invite or [by link](https://zapier.com/developer/public-invite/171896/79f0f6177294d5882a4e1eb79aa80fef/).

### Use of This Software

FCE is provided free of charge. You may use it in one of three ways:

- The most up-to-date version of the software is available within Zapier once you have used [this link](https://zapier.com/developer/public-invite/171896/79f0f6177294d5882a4e1eb79aa80fef/).
- Developers may wish to download the source from Github, make modifications, and use it as a private integration. See the Zapier CLI documentation for how to set up a developer environment for a custom integration.
- You may use the software in any other way consistent with the MIT licence.

### Setup and Authentication

1. If you have not already done so, follow [the link](https://zapier.com/developer/public-invite/171896/79f0f6177294d5882a4e1eb79aa80fef/) to add FCE to your Zapier account. You only need to do this once.
2. Set up an API application id and secret on your Fluxx Preprod and/or Production servers. The link is https://[[server url]]/oauth/applications
   1. Name the application e.g. "Zapier integration"
   2. Redirect URI: *copy and paste the following text:* https://zapier.com/dashboard/auth/oauth/return/App171896CLIAPI/
   3. Scopes: *leave blank*
   4. Click Submit
   5. The browser now shows the Application Name, Id, and Secret. Keep this window open as you will need the Id and Secret later.
3. In a new browser tab, create a new Zap in Zapier
4. For each Fluxx step in the Zap, choose "Fluxx Community Edition (X.Y.Z)"
5. The first time you do this, you need to "Connect to a new account" to connect to your Fluxx instance.
   1. Click on "Choose Account" then "Choose an Account", then "Connect a new account". A popup window appears, so ensure that popup windows are enabled for Zapier.com in your browser.
   2. In Fluxx Client Domain, enter the full domain name of the Fluxx Preprod or Production site, e.g. **mydomain.preprod.fluxxlabs.com**
   3. In Fluxx Application Id, copy and paste the Application Id you created in step 2
   4. In Fluxx Secret, copy and paste the "Secret" you created in step 2
   5. Click "Yes, Continue"
   6. The browser redirects to your chosen Fluxx instance, https://[[server url]]/oauth/authorize?client_id=...
   7. If the browser takes you to the Fluxx login page, complete the login then close the popup window and repeat from step 5i again.

If the authentication succeeds, congratulations! You are now ready to start automating Fluxx actions.

## Triggers

FEC includes two Triggers: Trigger on Queued Records, and Trigger on New Records.

### Trigger on Queued Records

* Fluxx Queues are created in the Fluxx Admin panel => Card Documents => [[ model type ]] => API Alerts. [_see Fluxx documentation for API Queue_][https://fluxxdev.atlassian.net/servicedesk/customer/portal/1/article/1795884009]
* In a nutshell, the API Queue system allows you to create a filter. Any time a record matches a Queue filter, the record is added to that queue. Zapier will poll the queue at regular intervals, and will loop through the list of records returned. You can also set up the Queue to add records that enter a particular state, or where a specific field is changed.
* API queues are identified by the Queue UUID, shown in the Fluxx Admin panel.
* Any fields selected from the Extra Fields selector in the Fluxx Admin panel are made available in subsequent Zapier steps.
* 