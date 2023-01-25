# Multi-Value Fields in Fluxx Community Edition

> When using the Create/Update Fluxx Record Action, use a special syntax to add or remove values and/or percentages from multi-valued fields i.e. Select-Transfer controls, Checkboxes, or Hierarchical Dropdowns.

### About Multi-Value Fields
* Each Select-Transfer control, set of Checkboxes, or Hierarchical Dropdown control relates to specific field name on a model. Different fields have independent sets of possible values.
* Each multi-attribute field has a set of Model Attribute Values that can be assigned to it. This is the set of values that you would maintain in Fluxx to form the dropdown or set of checkboxes.
* Each Model Attribute Value for a particular multi-value field has an id. If you have the MAV id, you can use that, but you don't have to — you can just use the name of the MAV, and FCE will look up the id for you.
* Model Attribute (MA):
  * The database table representing the field definition
  * Field examples:
    * name="test_multi_select"
    * description="Test Multi Select"
    * model_type="GrantRequest"
    * attribute_type="multi_value"
* Model Attribute Value (MAV):
  * The database table representing the possible set of values for the control.
  * This can be a heirarchy by use of the dependent_model_attribute_value_id parameter which points to a parent value.
  * Field examples:
    * description="Los Angeles"
    * value="LA"
    * dependent_model_attribute_value_id=12345 (the parent item in the hierarchy)
    * model_attribute_id=123 (link back to the Model Attribute that this MAV appears on)
* Model Attribute Choice (MAC):
  * The database table holding the actual selections made for a given multi-select field, on a given record. This holds a link to the MAV, a link to the record (e.g. a particular GrantRequest id), and optionally a percentage value.
  * Field examples:
    * model_attribute_value_id=99999 (the MAV that holds the text of the selected option)
    * model_attribute_id=123 (the field definition)
    * value=50 (the optional percentage value)
    * model_id=505051 (the Id of the GrantRequest or whatever model this relates to)
    * Note the the Model Type itself is not found here: you can get it from following the model_attribute_id, as the Model Attribute has a copy of the model_type.

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
* If your values are heirarchical, specify the full path to the value you want to add/delete, using the delimiter to separate the path portions.

e.g. let's say you have a hierarchy like this:

* California
  * Los Angeles
  * San Francisco
* Texas
  * Dallas
  * Houston


Remove all preious selections, then add San Francisco:

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

Add Los Angeles 50%, and change the percentage to 50% if Los Angeles was already present with a different percentage:

```
#remove_all
#add/50#California#Los Angeles
```