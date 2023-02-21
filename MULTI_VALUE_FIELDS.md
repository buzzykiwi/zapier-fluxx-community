# Multi-Value Fields in Fluxx Community Edition

> When using the Create/Update Fluxx Record Action, use a special syntax to add or remove values and/or percentages from multi-valued fields i.e. Select-Transfer controls, Checkboxes, or Hierarchical Dropdowns.

### About Multi-Value Fields
* Each Select-Transfer control, set of Checkboxes, and Hierarchical Dropdown control relates to specific field name on a model. Every such field has an independent set of possible values.
* Each multi-attribute field has a set of Model Attribute Values (MAVs) that can be assigned to it. This is the set of options that you maintain in Fluxx to form the dropdown or set of checkboxes.
* Each Model Attribute Value (MAV) for a particular multi-value field has an id. If you have the MAV id, you can use that, but you don't have to — you can just use the name of the MAV, and FCE will look up the id for you.
* _Model Attribute (MA):_
  * The database table representing the field definition
  * Field examples:
    * `name`="test_multi_select"
    * `description`="Test Multi Select"
    * `model_type`="GrantRequest"
    * `attribute_type`="multi_value"
* _Model Attribute Value (MAV):_
  * The database table representing the possible set of options for the control.
  * This can be a heirarchy by use of the dependent_model_attribute_value_id parameter which points to a parent MAV.
  * Field examples:
    * `description`="Los Angeles"
    * `value`="LA"
    * `dependent_model_attribute_value_id`=12345 (the parent item in the hierarchy)
    * `model_attribute_id=123` (link back to the Model Attribute that this MAV appears on)
* _Model Attribute Choice (MAC):_
  * The database table holding the actual selections made for a given multi-select field, on a given record. This holds a link to the MAV, a link to the record (e.g. a particular GrantRequest id), and optionally a percentage value.
  * Field examples:
    * `model_attribute_value_id`=99999 (the MAV that holds the text of the selected option)
    * `model_attribute_id`=123 (the field definition)
    * `value`=50 (the optional percentage value)
    * `model_id`=505051 (the Id of the GrantRequest or whatever Model Type this relates to)
    * Note the the Model Type itself is not found here: you can get it from following the `model_attribute_id`, as the Model Attribute has a copy of the model_type.

### Adding and Removing Model Attribute Values to a Field

* In the Create/Update Fluxx Record Action, you are given a text area to enter instructions for the MAVs to add or remove.
* Each instruction uses one line: use a line break (press Enter) to separate lines.
* The possible instructions are as follows:

```
#remove_all               Removes all existing MACs 
#remove#level 1#level 2   Remove existing MAC by path
#remove_id#123            Remove existing MAC by MAV id
#add#level 1#level 2      Adds MAC by name; removes percentage from existing item, or adds without percentage.
#add/50#level 1#level 2   Adds MAC by name with percentage. Any existing percentage in existing MAC is modified.
#add_id/50#123            Adds MAC by MAV id with percentage. Any existing percentage in existing MAC is modified.
```

* "Remove" instructions are performed before "add" instructions, irrespective of what order you put them in.
* A delimiter at the start of each line is required, but it does not have to be "#", as long as the same delimter is used during the rest of that line. You may wish to use a different delimiter if one of your options contains the character "#".
* If your values are hierarchical, specify the full path to the value you want to add/delete, using the delimiter to separate the path portions.

e.g. let's say you have this hierarchy of options for a multi-value list on a particular field in Fluxx:

* California
  * Los Angeles
  * San Francisco
* Texas
  * Dallas
  * Houston


Remove all previous selections, then add San Francisco:

```
#remove_all
#add#California#San Francisco
```

Add Houston to whatever was there before (ignored if Houston already existed):

```
#add#Texas#Houston
```

Add Dallas and Houston to whatever was there before:

```
#add#Texas#Houston
#add#Texas#Dallas
```

Add Los Angeles at 50%, and change the percentage to 50% if Los Angeles was already present with a different percentage:

```
#remove_all
#add/50#California#Los Angeles
```

### Replicating Model Attribute Values from One Record to Another

Imagine a scenario where you want to generate a new GrantRequest based on an existing GrantRequest, including the contents of a multi-select field, then add or remove some options from that field. The multi-select field is ``program_location``.

Here is how to set this up in FCE.

* Use one of the triggers to load in the record you want to replicate – or trigger with a webhook that provides the existing GrantRequest's id, and feed that into the "Search for Record" action to retrieve all the fields you want to replicate including program_location.
* Set up an Action: "Create/Update Fluxx Record".
  * Use "Field List for Update/Create" to select all of the different fields you want to replicate from the "input" GrantRequest, one per row.
  * In the Value List, map each value from the "input" GrantRequest in the previous step(s) to its associated field. The first field in the Field List maps to the first value in the Value List, and so on.
  * For program_location, the multi-select field you want to replicate, you have two options:
    * Use the output field from the previous step called ``Fields Program Location Add List``. This may contain something like `§add/40§Texas§Houston\n§add/60§Texas§Dallas`, which indicates two rows (two items selected in the dropdown), with Houston assigned 40% and Dallas assigned 60%. The format of these rows is _exactly_ the format used by Create/Update Fluxx Record to create new Model Attribute Values (selected items in a multi-select control).
    * Use the output field from the previous step called ``Fields Program Location Add List By Id``. This may contain something like `§add/40§2055430\n§add/60§2055432`, indicating the ID number for Houston (2055430) and Dallas (2055432). This option is preferable if there is any chance that there is more than one possible value with the same path name (e.g. two items called Texas/Houston).
  * If there are any options that you would like to remove from ALL duplicated items, or any you need to add, add some remove or add lines to the same input control, after the substituted value from the previous step. Don't forget that you can use any delimiter character you like, as long as it remains consistent for the rest of the line.
  * A third option may be available depending on your needs: a set of fields called `Fields Program Location Line Items [ID|Path|Value|Description|Percent]`. These can be used in any action that supports Line Items [docs here](https://zapier.com/blog/formatter-line-item-automation/).
  
e.g.
```
[2.Fields Program Location Add List: §add/40§Texas§Houston...llas]
#remove#Texas#Austin
$add$California$Los Angeles
```

In this case, the new GrantRequest will gain any multi-select items selected in the original GrantRequest, then Texas/Ausin will be removed (if present), and California/Los Angeles will be added for all (if not already copied from the original).

**Important**

Lists of multi-attribute selections are unique for each field on your model. i.e. if you have a dropdown on field `program_location` for "California" and "Texas", and the same options on a different field `program_location2`, then the two sets of options have different ID numbers, even if they have the same names. Therefore, you can't copy MAV selections between two _different_ fields by ID, only by name, so long as those names/options exist in the destination dropdown.

Likewise, MAV ids are not shared between different models. If you have a `program_location` field on GrantRequest and another `program_location` field on Organization with the same options set up in both, the MAVs (options) do not share the same MAV ids. Therefore, only use the "Add List By Id" form of MAVs when you are using these to generate a new set of options in the _same field on the same model_.