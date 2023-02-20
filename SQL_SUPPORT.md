# SQL Support in Fluxx Community Edition

The Fluxx API search filters can be difficult to construct by hand. FCE therefore allows an SQL-like SELECT statement to be used in certain triggers and actions. It converts the SQL-like statement into a filter which is then used to search using the Fluxx API.


### Important

There are two types of database tables in Fluxx when it comes to searching: "Elastic enabled" and "Non-Elastic Enabled". Most of the common tables/model types such as GrantRequest, Organization, RequestTransaction etc are Elastic-enabled. In Triggers & Actions that perform searches in Fluxx, the FCE interface will generally indicate whether the selected Model Type is Elastic-enabled or not.

* Elastic-enabled tables/model types allow a large range of operators (e.g. `IN RANGE`, `IS IN NEXT nn FISCAL YEARS`, `STARTS WITH` etc), equivalent to what can be achieved using Advanced card filters within Fluxx.
* Non-Elastic enabled tables/model types have significant limitations, equivalent to what can be achieved using "Basic" filters within Fluxx.


### Syntax Example

```sql
SELECT id, project_title, amount_requested, amount_recommended, program_organization_id.name 
FROM GrantRequest WHERE state = "granted" AND amount_requested < 1000 
ORDER BY amount_requested, project_title desc LIMIT 100
```

The syntax even allows cross-card filtering (sorry, this syntax is a departure from SQL). The foreign key comes first followed by _CROSSCARD( conditions on the related model's fields )_ ...

```sql
SELECT id FROM GrantRequest 
WHERE program_organization_id CROSSCARD(city = 'Auckland' AND gst_registered = 'y')
AND amount_requested < 1000
```


### Syntax Rules

* `SELECT «field list» FROM «model type» WHERE «conditions» ORDER BY «ordering list» LIMIT «limit»`
  * `ORDER BY «ordering list»` is optional
  * `LIMIT «limit»` is optional
  * All SQL keywords such as `SELECT`, `FROM`, `WHERE`, `AND`, `OR`, `NOT`, `ORDER BY` and `LIMIT` must be capitalised
  * The expression may contain line breaks, spaces and tabs
* `«field list»` is a comma-separated list of "internal" field names, e.g. `id, name, updated_at`
  * You can use dot notation to retrieve to-one relationship data.
    * In most cases, the “local” field has to end in “_id”, e.g. `program_organization_id.name`, not `program_organization.name`. This is a limitation of the Fluxx API.
    * The dot relationships are turned into “relation” attributes in the API call, transparent to the user.
  * You cannot use * as a wildcard. Every field name must be explicitly specified.
* `«model type»` is the name of a single model.
  * The model type can be given as `grant_request` or `GrantRequest` (snake or camel-case), and include dynamic model names (`MacModelTypeDynMyTableName`). Do not use spaces within the model name.
* `«conditions»`
  * You cannot use mathematical operations in the WHERE clause:
    * invalid: `WHERE (amount_requested * 1.5 < 1000)`
    * valid: `WHERE amount_requested < 666.67`
  * You cannot compare one field to another. Field names can only appear on the left side of a clause.
    * valid: `WHERE amount_recommended > 10000`
    * invalid: `WHERE (amount_recommended > amount_requested)`
  * __Elastic-enabled models__ can be multiply nested with brackets, and can include all types of comparisons allowed in Fluxx. See operator list below.
    * ANDs, ORs and NOTs follow mathematical binding principles. `a OR b AND c OR d` is treated as `(a OR (b AND c) OR d)`
  * __Non-Elastic models__ have to follow the structure of basic Fluxx filters:
    * “=“ comparisons only
    * NOTs are not allowed
    * If you give multiple possible values for a single field, these must be ORed together
    * If more than one field is mentioned, any possible values for that field are ANDed with the values for any other field
    * valid: `WHERE (field1 = 1 OR field1 = 2 OR field1 = 3) AND (field2 = "a" OR field2 = "b" OR field2 = "c")`
    * invalid:
      * `WHERE (field1 = 1 AND field2 = "a") OR (field1 = 2 AND field2 = "b")`
      * `WHERE field1 >= 2`
  * Strings in comparisons can be surrounded by single or double quotes. Quote escapes are allowed e.g. `'Bob\'s Diner'`. Curly quotes are not allowed.
    * valid:
      * `WHERE field2 = "a"`
      * `WHERE field2 = 'a'`
    * invalid:
      * `WHERE field2 = 'a"`
      * `WHERE field2 = ‘a’`
* `«ordering list»` is a one or more fields (comma-separated) to sort by
  * You cannot sort by dot-relations, only by fields on the main model being queried
  * For each field, you can specify `asc` (ascending) or `desc` (descending) following the field name to indicate the sort direction. The records are sorted by the first field & direction, then for any elements where that field is equal, they are sorted by the second field & direction, etc.
  * valid:
    * `ORDER BY name asc, updated_at desc`
    * `ORDER BY program_organization_name` (because that is a valid field that automagically traverses the relationship for you)
  * invalid:
    * `ORDER BY program_organization_id.name`
* There are no “joins”, though the dot-relations do a sort of join for to-one relationships.
* Some fields that return a list of ids, e.g. `program_organization.grant_ids`, so there is a limited selection of to-many relationships possible.


### Available Operators

* `=`
* `==`  (acts same as =)
* `eq`
* `EQ`
* `!=`
* `<>`
* `neq`
* `NEQ`
* `not-eq`
* `NOT-EQ`
* `NOT EQ`
* `<`
* `lt`
* `LT`
* `>`
* `gte`
* `GTE`
* `<=`
* `lte`
* `LTE`
* `STARTS-WITH`
* `STARTS WITH`
* `NOT STARTS WITH`
* `NOT-STARTS-WITH`
* `CONTAINS`
* `NOT-CONTAINS`
* `NOT CONTAINS`
* `LIKE`
* `NOT-LIKE`
* `NOT LIKE`

* `IS NULL`
* `IS NOT NULL`
* `IS IN RANGE nn-nn`
* `IS IN YEAR RANGE yyyy-yyyy` (single year also valid)
* `IS IN FISCAL YEAR RANGE yyyy-yyyy` (single year also valid)
* `IS YESTERDAY`
* `IS TODAY`
* `IS TOMORROW`

* `IS IN LAST nn DAYS`
* `IS IN NEXT nn DAYS`
* `IS nn DAYS AGO`
* `IS LAST WEEK`
* `IS THIS WEEK`
* `IS NEXT WEEK`
* `IS IN LAST nn WEEKS`
* `IS IN NEXT nn WEEKS`
* `IS nn WEEKS AGO`
* `IS LAST MONTH`
* `IS THIS MONTH`
* `IS NEXT MONTH`
* `IS IN LAST nn MONTHS`
* `IS IN NEXT nn MONTHS`
* `IS nn MONTHS AGO`
* `IS LAST QUARTER`
* `IS THIS QUARTER`
* `IS NEXT QUARTER`
* `IS IN LAST nn QUARTERS`
* `IS IN NEXT nn QUARTERS`
* `IS nn QUARTERS AGO`
* `IS LAST FISCAL QUARTER`
* `IS THIS FISCAL QUARTER`
* `IS NEXT FISCAL QUARTER`
* `IS IN LAST nn FISCAL QUARTERS`
* `IS IN NEXT nn FISCAL QUARTERS`
* `IS nn FISCAL QUARTERS AGO`
* `IS LAST YEAR`
* `IS THIS YEAR`
* `IS NEXT YEAR`
* `IS IN LAST nn YEARS`
* `IS IN NEXT nn YEARS`
* `IS nn YEARS AGO`
* `IS LAST FISCAL YEAR`
* `IS THIS FISCAL YEAR`
* `IS NEXT FISCAL YEAR`
* `IS IN LAST nn FISCAL YEARS`
* `IS IN NEXT nn FISCAL YEARS`
* `IS nn FISCAL YEARS AGO`
* `CROSSCARD(   )`

* `NOT` can be put before a set of brackets, or before a single field operator operand expression, e.g.

  * `NOT(name = 'People Inc' AND city = 'Whanganui')`
  * `NOT name = 'People Inc'`
