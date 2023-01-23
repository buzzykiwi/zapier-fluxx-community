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
- [Triggers](#triggers)
  * [Trigger on Queued Records](#trigger-on-queued-records)
  * [Trigger on New Records](#trigger-on-new-records)
  * [Download File](#download-file)
- [Actions](#actions)
  * [File Download](#file-download)
  * [File Upload](#file-upload)
  

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

FEC includes two Triggers: Trigger on Queued Records, and Trigger on New Records, plus a third, deprecated trigger that can access Fluxx ModelDocuments.

### Trigger on Queued Records

* Fluxx Queues are created in the Fluxx Admin panel => Card Documents => [[ model type ]] => API Alerts. [_see Fluxx documentation for API Queue_](https://fluxxdev.atlassian.net/servicedesk/customer/portal/1/article/1795884009)
* In a nutshell, the API Queue system allows you to create a filter. Any time a record matches a Queue filter, the record is added to that queue. Zapier will poll the queue at regular intervals, and will loop through the list of records returned. You can also set up the Queue to add records that enter a particular state, or where a specific field is changed.
* API queues are identified by the Queue UUID, shown in the Fluxx Admin panel.
* Any fields selected from the Extra Fields selector in the Fluxx Admin panel are made available in subsequent Zapier steps.
* Records processed the the API queue are _not_ subject to de-duping in Zapier. i.e. Zapier will process the same record multiple times if it is added to multiple queues, or to the same queue on multiple occasions. Tech note: This is achieved by giving Zapier a derived key for each record, based on the record ID and the current time, rather than the record id alone.

### Trigger on New Records

* This is a traditional Zapier-style trigger, operating on a timed basis, and designed to detect new records added to Fluxx.
* It utilises Zapier's de-duping, so will not trigger more than once on the same record while the Zap is live. Be aware that the de-duping is reset if the Zap is stopped and re-started, so take care if you perform operations on a Fluxx record that should be only done once.
* Configuration of which records to return (i.e. which list of records will be regularly downloaded to check for additions) is done via FCE's [_SQL Support_](./SQL_SUPPORT.md).

### Download File

* Deprecated, and will likely be removed in future releases.
* It takes one parameter, the ModelDocument Id, and returns parameters id, document_content_type, document_file_name, created_at, created_by_id.full_name, updated_by_id.full_name, updated_at, doc_label, document_file_size, document_updated_at, original_file_name, model_document_type_id.name, document_type, document_text, documentable_type, documentable_id, model_document_template_id.description as well as "file", a url that holds the file. This url can be used for input to apps such as gmail/Exchange mail as a file attachment.

## Actions

### File Download

* Input: the Id of the ModelDocument you want to download
* Output: 
  * id
  * file (type: file, can be used as input in any Zap action that takes a file as input)
  * document_content_type
  * document_file_name
  * created_at
  * created_by_id.id
  * created_by_id.full_name
  * updated_at
  * updated_by_id.id
  * updated_by_id.full_name
  * doc_label
  * document_file_size
  * document_updated_at
  * original_file_name
  * model_document_type_id.id
  * model_document_type_id.name
  * document_type
  * document_text
  * documentable_type
  * documentable_id
  * model_document_template_id.id
  * model_document_template_id.description
* Notes:
  * The file output uses Zapier's dehydrate function, which temporarily hosts the file on a Zapier server
  * Occasionally, this action seems to truncate the file before passing it on. Please report this if it happens.
  * If you require any other fields, e.g. Dynamic Fields, you can retrieve these with the Action "Search for a Single Fluxx Record" or the Search "Search for Record". Both options allow you to specify arbitrary field names to retrieve, but neither will return the file contents itself.

### File Upload

This action creates a new ModelDocument based on a document output from a previous Zap trigger or action (e.g. a mail attachment from an email received in Gmail or Exchange Mail, or from a previous Fluxx action), or from a URL. If you have a static file that you want to upload, you will need to upload it to a web site/service in order to get a URL for it.

* Input:
  * Filename including extension (required)
  * File (required). The file field acts differently depending on what data is mapped to it:
    * Text: Zapier will turn text into a .txt file and that file will be uploaded to the app.
    * URL: if you enter a URL, Zapier will try to load the data available at that address and upload it as a file.
    * File: if a file is mapped from the trigger or another action, Zapier will upload it.
  * Doc Label: Label for document so that different Document components can pick different sets of documents, by label. Default: _default_
  * Content (MIME) Type (required). This is usually available from the trigger or action that provided the file. e.g.
    * text/plain
    * application/pdf
    * image/png
    * image/jpeg
    * application/msword
    * application/vnd.openxmlformats-officedocument.wordprocessingml.document
    * text/csv
    * application/vnd.ms-excel
    * application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
    * application/vnd.ms-powerpoint
    * application/vnd.openxmlformats-officedocument.presentationml.presentation
    * application/zip
    * audio/mpeg
    * video/mp4
    * video/mpeg
  * Model Type (required): Can be in snake_case or CamelCase (e.g. grant_request or GrantRequest). This is the type of model to which the document will be attached. All new documents must be attached to a model.
  * Related Model Id (required): the Id of the model to which the document will be attached.
  * Model Document Type: This dynamic dropdown queries Fluxx for the ModelDocumentTypes available for the Model Type chosen. The resultant ModelDocument will be labelled with this Model Document Type. The list is the same as what you would find listed in the Fluxx Admin panel on Card Documents => {{ Model Type }} => Documents tab
  * Model Document Sub Type: If the selected Model Document Type has sub types, this selector will allow you to select which one use.
  * "name segment for user search below": This is a helper field for the User Id selector. Fill in this field with the name (or part of the name) of the "created_by" user, before searching with the selector below. This helps to trim down the number of results shown. NOTE: you must select a user below, after filling in this box.
  * Created By Id (required): enter the User id to use for the Created By Id. You may be able to may a user id from a previous step, _or_ use the box above to help narrow down the Id search.
* Output
  * id (the ModelDocument Id)
  * document_type (returns "file")
  * doc_label (e.g. "default")
  * document_content_type (the MIME type)
  * document_file_name
  * model_document_type_id.id
  * model_document_type_id.name
  * model_document_sub_type_id.id
  * model_document_sub_type_id.name
  * updated_by.id
  * updated_by.full_name
  * created_by.id
  * created_by.full_name
  * document_file_size (in Bytes)
* Notes:
  * 
