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
  * [Search for a List of Fluxx Records With Line Item Support](#search-for-a-list-of-fluxx-records-with-line-item-support)
  * [Search for a Single Fluxx Record](#search-for-a-single-fluxx-record)
  * [Create/Update Fluxx Record](#createupdate-fluxx-record)
  

## Getting Started
> FCE is third-party, open source software. As it is not provided or endorsed by Fluxx, the Zapier integration is a Private rather than Public integration. i.e. you will not find FCE in Zapier's standard list of integrations. To use it, follow [this link](https://zapier.com/developer/public-invite/171896/79f0f6177294d5882a4e1eb79aa80fef/) to add it to your Zapier account.


### Public vs Private Zapier Integrations

Zapier has two levels of integrations/apps. Public integrations are "first-class citizens": the integrations go through a rigorous assessment by Zapier staff and are then listed and available for all Zapier users. In order for an integration to go public, it has to be developed by the owner of the API (Fluxx) or an authorised contractor. Third-party developers cannot make their integrations Public in this way, but they may make their Private integration available via invite or [by link](https://zapier.com/developer/public-invite/171896/79f0f6177294d5882a4e1eb79aa80fef/).


### Use of This Software

FCE is provided free of charge. You may use it in three ways:

- The most up-to-date version of the software is available within Zapier once you have used [this link](https://zapier.com/developer/public-invite/171896/79f0f6177294d5882a4e1eb79aa80fef/).
- Developers may wish to download the source from Github, make modifications, and use it as a private integration. See the Zapier CLI documentation for how to set up a developer environment for a custom integration.
- You may use the software in any other way consistent with the MIT licence.

### Setup and Authentication

1. If you have not already done so, follow [the link](https://zapier.com/developer/public-invite/171896/79f0f6177294d5882a4e1eb79aa80fef/) to add FCE to your Zapier account. You only need to do this once.
2. Set up an API application id and secret on your Fluxx Preprod and/or Production servers. The link is **https://[[server url]]/oauth/applications**
   1. Name the application e.g. "Zapier integration"
   2. Redirect URI: *copy and paste the following text:* https://zapier.com/dashboard/auth/oauth/return/App171896CLIAPI/
   3. Scopes: *leave blank*
   4. Click Submit
   5. The browser now shows the Application Name, Id, and Secret. Keep this window open as you will need the Id and Secret later.
3. In a new browser tab, create a new Zap in Zapier
4. In the search bar under *1. Trigger*, search for *Fluxx* 
5. Choose "Fluxx Community Edition (X.Y.Z)" under "Choose app & event"
6. Choose an Event that will occur in Fluxx and trigger this Zap to start processing. e.g. "Trigger on New Records", then "Continue"
7. The first time you do this, you need to click on "Sign In" next to "Connect Fluxx Community Edition *(nn.nn.nn)*" to connect to your Fluxx instance.
   1. A popup window appears, so ensure that popup windows are enabled for Zapier.com in your browser.
   2. In Fluxx Client Domain, enter the full domain name of the Fluxx Preprod or Production site, e.g. **mydomain.preprod.fluxxlabs.com**. Do not include the leading *https://*
   3. In Fluxx Application Id, copy and paste the Application Id you created in step 2
   4. In Fluxx Secret, copy and paste the "Secret" you created in step 2
   5. Click "Yes, Continue"
   6. The browser redirects to your chosen Fluxx instance, https://[[server url]]/oauth/authorize?client_id=...
   7. If the browser takes you to the Fluxx login page, complete the login then close the popup window and repeat from step 7i again.
8. Finish setting up the trigger. The "Trigger on New Records" trigger could use a trigger such as: `SELECT id, full_name FROM User ORDER BY updated_at desc LIMIT 100` to take the latest 100 records, and trigger on any new ones found.
9. Perform the Test Trigger step to ensure that Zapier is able to retrieve records from Fluxx. Zapier will pull in the latest three individual records and name them SQL Records Search Results [A-C].

If the authentication succeeds, congratulations! You are now ready to start automating Fluxx actions.


## Triggers

FCE includes two Triggers: Trigger on Queued Records, and Trigger on New Records, plus a third, deprecated trigger that can access Fluxx ModelDocuments.


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

* **Input**
  * **id**: the Id of the ModelDocument you want to download
* **Output** 
  * **id**
  * **file** (type: file, can be used as input in any Zap action that takes a file as input)
  * **document_content_type**
  * **document_file_name**
  * **created_at**
  * **created_by_id.id**
  * **created_by_id.full_name**
  * **updated_at**
  * **updated_by_id.id**
  * **updated_by_id.full_name**
  * **doc_label**
  * **document_file_size**
  * **document_updated_at**
  * **original_file_name**
  * **model_document_type_id.id**
  * **model_document_type_id.name**
  * **document_type**
  * **document_text**
  * **documentable_type**
  * **documentable_id**
  * **model_document_template_id.id**
  * **model_document_template_id.description**
* **Notes**
  * The file output uses Zapier's dehydrate function, which temporarily hosts the file on a Zapier server
  * Occasionally, this action seems to truncate the file before passing it on. Please report this if it happens.
  * If you require any other fields, e.g. Dynamic Fields, you can retrieve these with the Action "Search for a Single Fluxx Record" or the Search "Search for Record". Both options allow you to specify arbitrary field names to retrieve, but neither will return the file contents itself.


### File Upload

This action creates a new ModelDocument based on a document output from a previous Zap trigger or action (e.g. a mail attachment from an email received in Gmail or Exchange Mail, or from a previous Fluxx action), or from a URL. If you have a static file that you want to upload, you will need to upload it to a web site/service in order to get a URL for it.

All files uploaded through this Action must be attached to a Model Type and Model Id, e.g. attached to GrantRequest with id 12345. It is recommended that you also specify a Doc Label (often _default_) and a Model Document Type by id.

* **Input**
  * **Filename including extension** (required)
  * **File** (required). The file field acts differently depending on what data is mapped to it:
    * Text: Zapier will turn text into a .txt file and that file will be uploaded to the app.
    * URL: if you enter a URL, Zapier will try to load the data available at that address and upload it as a file.
    * File: if a file is mapped from the trigger or another action, Zapier will upload it.
  * **Doc Label**: Label for document so that different Document components can pick different sets of documents, by label. Default: _default_
  * **Content (MIME) Type** (required). This is usually available from the trigger or action that provided the file. e.g.
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
  * **Model Type** (required): Can be in snake_case or CamelCase (e.g. grant_request or GrantRequest). This is the type of model to which the document will be attached. All new documents must be attached to a model.
  * **Related Model Id** (required): the Id of the model to which the document will be attached.
  * **Model Document Type**: This dynamic dropdown queries Fluxx for the ModelDocumentTypes available for the Model Type chosen. The resultant ModelDocument will be labelled with this Model Document Type. The list is the same as what you would find listed in the Fluxx Admin panel on Card Documents => {{ Model Type }} => Documents tab
  * **Model Document Sub Type**: If the selected Model Document Type has sub types, this selector will allow you to select which one use.
  * **"name segment for user search below"**: This is a helper field for the User Id selector. Fill in this field with the name (or part of the name) of the "created_by" user, before searching with the selector below. This helps to trim down the number of results shown. NOTE: you must select a user below, after filling in this box.
  * **Created By Id** (required): enter the User id to use for the Created By Id. You may be able to may a user id from a previous step, _or_ use the box above to help narrow down the Id search.
* **Output**
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


### Search for a List of Fluxx Records With Line Item Support

There may be times when you need to load in a set of Fluxx records related to a previous item, perhaps to access their values or to update them in some way. This action allows you to perform a Fluxx search based on a SQL-like query. If there are values from the Trigger or a previous Action that you need to use in the query, you can sub these values into the text box where appropriate.

The list of items is returned as a Zapier "Line Item" set. You can use the "Looping by Zapier" action to loop through the line items, repeating any subsequent Zap steps for each of the items in the Line Item set. Note that each Action completed in a loop iteration counts against your Zapier Tasks count.

* **Input**
  * **SQL input**: see [_SQL Support_](./SQL_SUPPORT.md) e.g. `SELECT id, name, nz_charities_number FROM Organization WHERE postal_code = "4500"`
    * Don't forget that you can sub values from previous steps into the SQL string e.g. ... `WHERE postal_code = [[1. Postal Code: 4500]]`
  * **Show MAVs**: indicate True/False (default False). If true, any Multi Attribute Values returned will return percentage value (if available) and hierarchy information.
* **Output**
```
results
  1:
    id: 105
    model_type: organization
    fields:
      id: 105
      name: Support Group for Those Bereaved by Suicide
      nz_charities_number: null
      (all other requested fields appear here)
  2:
    id: 12
    model_type: organization
    fields:
      id: 12
      name: Central Kindergarten
      nz_charities_number: null
      (all other requested fields appear here)
```


### Search for a Single Fluxx Record

This action allows you retrieve a Fluxx record via arbitrary SQL-like search. If you already have a record id, you should use the "Search for Record" Action instead of this one. This Action is better suited to more complex retrievals where you do not have the id of the record, but have to search with a more complex filter.

As the search may return more than one item, only the _first_ item returned will be used by Zapier, so you may wish to use an `ORDER BY` clause, and `LIMIT 1` in order to place the most relevant item at the start of the list. e.g.

* to use the most recent match: `ORDER BY updated_at desc LIMIT 1`
* to use the largest grant request: `ORDER BY amount_requested desc LIMIT 1`

* **Input**
  * **SQL input**: see [_SQL Support_](./SQL_SUPPORT.md) e.g. `SELECT id, account_name, account_number FROM BankAccount WHERE owner_organization_id = [[ id from previous step ]] AND active = 1 ORDER BY updated_at desc LIMIT 1`
  * **Show MAVs**: indicate True/False (default False). If true, any Multi Attribute Values returned will return percentage value (if available) and hierarchy information.

* **Output**
```
id: 173
model_type: bank_account
fields:
  id: 17443
  account_name: Save The Kids Trust
  account_number: 12-3456-1234567-000
  (all other requested fields appear here)
```


### Create/Update Fluxx Record

This Action will update a given Fluxx record if a Model Type and record id is specified. With no record id, it will create a new Fluxx record of the specified Model Type with the information provided.

It is up to you to ensure that all required fields are given valid values.

* **Input**
  * **Record ID**: Enter the id of the record to update, or leave blank to create a new record
  * **Model Group** (required): As there are so many model types to choose from, they have been broken down into four lists: Basic, Intermediate, Dynamic Models only, and All. This filters the Model Types shown in the Model Type field. "Basic" contains Document, Grant Request, Initiative, Organization, Program, Project, Request Report, Request Transaction, Sub Initiative, Sub Program, and User.
  * **Model Type** (requred): accepts model types in both styles: grant_request or GrantRequest. You must specify a Model Type before the Field List for Update/Create control will appear.
  * **Field List for Update/Create** (required)
    * This multiple-select control knows about all Core and Dynamic fields available for the Model Type you specify above.
    * The list of Core fields is followed by the list of Dynamic fields.
    * Each time you select a field, a new box appears below in order for you to specify another field. In this way, you first need to specify all the fields that you are going to update/create.
    * After you enter each field name, more information about that field appears in a list below the Field List

e.g.
```
Core field: model_theme_id
  • This is the ID of the theme that the record is using to render.
  • type: relation (ModelTheme) [links to API docs for ModelTheme on your Fluxx instance]
```

* Input (continued)
  * **Value List** (required)
    * For each of the fields in the Field List (above), you need to specify a value. Like the Field List, each time you fill in a value a new box appears below.
    * You must have the same number of boxes in the Field List as you have boxes in the Value List. The first box in the Field List matches with the first box in the Value List, the second box in the Field List matches with the second box in the Value List, etc.
    * For boolean values, use 1 for true and 0 for false.
    * For foreign keys (most fields that end in "_id"), either hard-code an id, or you may need to perform another search to retrieve the required id. To set the id to null, leave the text field blank.
    * Multi-attribute values (select controls that allow more than one value, and/or percentage) can be specified using a [special syntax](./MULTI_VALUE_FIELDS.md) that allows you to _remove_ existing selections and/or add selections. It cannot create Model Attribute Values that do not already exist in the system.