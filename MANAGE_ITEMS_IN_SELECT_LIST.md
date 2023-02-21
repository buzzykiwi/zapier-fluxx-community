# Manage Items in Fluxx Select Lists

> FCE can alter the list of available options in Select-transfer controls, Checkboxes, Dropdowns, or Hierarchical Dropdowns. This is done with the **Manage Items in SELECT Lists** Action.

> When using the **Create/Update Fluxx Record** Action, you can also use a special syntax to add or remove options and/or percentages from multi-valued fields for the records themselves i.e. Select-Transfer controls, Checkboxes, or Hierarchical Dropdowns  *[documentation](./MULTI_VALUE_FIELDS.md)*

## Zapier Action: Manage Items in SELECT Lists (With Line Item Support)

This action performs mass edits on the options available for a given model type and SELECT field. It works for both single select controls (radio buttons and dropdowns), and for multi-select controls (Select-transfer controls, Checkboxes, and Hierarchical Dropdowns).

All new or edited options happen as part of the same Action, so Zapier only charges you for one Task, no matter how many options were added/edited.

In order to perform multiple operations, you need to be able to create the options as Line Items. This is commonly done in Zapier with a connected Spreadsheet, e.g. Microsoft Excel spreadsheet hosted in Sharepoint/OneDrive. You can use the Updated Row in Microsoft Excel trigger. In the Trigger, specify a column for Zapier to monitor ("Trigger Column"). Any time it detects a change in a row for that column, it will send the entire row to FCE to create/remove/edit the specified option.

We recommend that you create a column that contains an internal "version" number, and get Zapier to monitor that. If you want to make a change to the Description, Retired value or Order, just bump up the version number for that row, and the change will be actioned.

Note that you cannot use this action to change the Path or Value (last item in a path) of an option. If you make changes to these, the row will be recognised as a new option, and created if it did not already exist.

Here's an example spreadsheet:

| Action   | Path                                 | Description  |  Retired (1 for yes)  |  Order  | Version |
| ---------- |-----------------------------------| ----------------|---------------------------|-----------:|----------:|
| add       | #California#Long Beach | Long Beach | 0                              | 1           | 1 |
| add       | #California#Los Angeles | Los Angeles | 0                             | 2            | 1 |
| add       | #California#Reading       | Reading        | 0                            | 3            | 1 |
| add       | #California#Sacramento | Sacramento | 0                             | 4            | 1 |
| add       | #California#Santa Barbara | Santa Barbara | 0                     | 5            | 1 |
| remove | #Washington#Seattle      |    |  |  | 1 |

### Action Setup

* **Input**
  * **Model Group** (required) Helps to filter the number of Model Types shown in the next control
  * **Model Type** (required)
  * **Choose a SELECT field** (required) This detects all Dynamic Fields that are Select lists. Pick which one you want to add/remove items to/from.
  * **Remove All** (required) Before the list of options is run, do you want to remove all existing items? Use with care, and consider just retiring upwanted options rather than deleting them.
  * **[name segment for user search below]** Enter part of the name for the Fluxx User you want these new options to be "created by" or "edited by".
  * **Created By Id** (required) Once you have entered part of the name using the previous control, a filtered list of Fluxx User's names appears here, for you to choose from.

  * **Line Items**
  * **Action** (required) Enter the Line Item containing the action for each new option, here, or type in the action if it will apply to all items. Valid strings are "remove" and "add". Leave blank to add.
  * **Path** (required) Enter the Line Item containing the path for each new option, here. Any non-existent sub-levels will be created for you. The first character must be a delimiter (of your choice), that is then used to separate path segments/levels if it is a multi-level Select control. Do not add a final delimiter e.g. #California#Los Angeles or /Colorado/Boulder or #New Zealand
  * **Description** Enter the Line Item containing the description of the new Select option, here (optional). If not used, the Select option will display the last item in its path name (the "value"); otherwise, the Description is used for display.
  * **Retired** (true/false, or 1/0) Should the Select option be marked as "retired"? Retired options are not shown to the user unless they were already selected for a field. (optional)
  * **Order** Enter the Line Item containing the order number for the Select option. (optional)

Line Item fields from the "Updated Row in Microsoft Excel" trigger look like this when you select them for use in the Line Item fields described above:

``` 
1. COL A: add
1. COL B: #California#Long Beach
1. COL C: Long Beach
1. COL D: 0
1. COL E: 1
1. COL F: 1
``` 

If there was not already a top level option called "California", this will be created automatically when Long Beach is created as a second level. Because FCE has no further information about the "California" option, it will be created without a description or order number. Because of this, we suggest that you create sub-levels explicitly, before you create sub-levels for them. This way, you can specify a description and order number.

If the exact path specified for a row *already exists* as an option, any changes to the Description, Retired or Order columns will be updated in Fluxx.

  * **Output**
    * **all_deletes_results** - lists any existing options deleted if you specified "Remove All".
    * **updates_results** - lists any options whose description, "retired" value or order were updated.
    * **deletes_results** - lists any options that where deleted because of a line item action of "remove"
    * **creates_results** - lists any options created because of a line item action of "add"
  
If the Action performed any manipulations on a SELECT field, the results will be listed below whichever heading it relates to. e.g. if you created two options through the Line Items, you could receive the following output:

```
creates_results:
  1:
    model_type: model_attribute_value
    id: 10263141
    fields:
      id: 10263141
      description: New Grant Type
      value: New Grant Type
      retired: 0
      display_order: null
  2:
    model_type: model_attribute_value
    id: 10263142
    fields:
      id: 10263142
      description: Another New Grant Type
      value: Another New Grant Type
      retired: 0
      display_order: 2
```

