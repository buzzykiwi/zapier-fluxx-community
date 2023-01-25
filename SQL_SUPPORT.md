# SQL Support in Fluxx Community Edition

The Fluxx API search filters can be difficult to construct. FCE therefore allows an SQL-like SELECT statement to be used for certain triggers and actions. It converts the SQL-like statement into a filter that can be used in the Fluxx API.

Example:

```sql
SELECT id, project_title, amount_requested, amount_recommended, program_organization_id.name FROM GrantRequest WHERE state = "granted" AND amount_requested < 1000 ORDER BY amount_requested, project_title LIMIT 100
```

The syntax even allows cross-card filtering (sorry, this syntax is a departure from SQL). The foreign key comes first followed by _CROSSCARD( conditions on the related model's fields )_ ...

```sql
SELECT id FROM GrantRequest WHERE program_organization_id CROSSCARD(city = 'Auckland' AND gst_registered = 'y') AND amount_requested < 1000
```

Rules:

* All SQL keywords such as SELECT, FROM, WHERE, AND, OR, NOT, ORDER BY and LIMIT must be capitalised. This is to help with parsing.
* FROM model names can be given as grant_request or GrantRequest (snake or camel-case), and include dynamic model names (MacModelTypeDyn…)
* Field names (SELECT field1, field2 etc) can use dot notation to retrieve to-one relationship data. In most cases, the “local” field has to end in “_id”, e.g. program_organization_id.name, not program_organization.name. This is a limitation of the Fluxx API. The dot relationships are turned into “relation” attributes in the API call, transparent to the user.
* The WHERE clause
  * Elastic-enabled models: can be multiply nested with brackets, and can include all types of comparisons allowed in Fluxx
  * Non-Elastic models: have to follow the structure of basic Fluxx filters: “=“ comparisons only, with no NOTs, e.g. WHERE (field1 = 1 OR field1 = 2 OR field1 = 3) AND (field2 = 1 OR field2 = 2 OR field2 = 3)
  * ANDs, ORs and NOTs follow mathematical binding principles. a OR b AND c OR d is treated as (a OR (b AND c) OR d)
* Strings in comparisons can be surrounded by single or double quotes. Quote escapes are allowed e.g. 'Bob\'s Diner'. Curly quotes are not allowed.
* You cannot sort by dot-relations, only by fields on the main model being queried
* There are no “joins”, though the dot-relations do a sort of join for to-one relationships.
* Some fields that return a list of ids, e.g. program_organization.grant_ids, so there is a limited selection of to-many relationships possible.
* You can’t use mathematical operations in the WHERE clause:
  * not allowed: WHERE (amount_requested * 1.5 < 1000)
* You can’t compare one field to another. You can only specify a field on the left side of a clause.
  * not allowed: WHERE (amount_recommended > amount_requested)

Complete list of operators:

* =
* ==
* eq
* EQ
* !=
* <>
* neq
* NEQ
* not-eq
* NOT-EQ
* NOT EQ
* <
* lt
* LT
* >
* gte
* GTE
* <=
* lte
* LTE
* STARTS-WITH
* STARTS WITH
* NOT STARTS WITH
* NOT-STARTS-WITH
* CONTAINS
* NOT-CONTAINS
* NOT CONTAINS
* LIKE
* NOT-LIKE
* NOT LIKE

* IS NULL
* IS NOT NULL
* IS IN RANGE (nn - nn)
* IS IN YEAR RANGE (\\d+/\\d+/\\d+ *- *\\d+/\\d+/\\d+)
* IS IN FISCAL YEAR RANGE (\\d+/\\d+/\\d+ *- *\\d+/\\d+/\\d+)
* IS YESTERDAY
* IS TODAY
* IS TOMORROW

* IS IN LAST nn DAYS
* IS IN NEXT nn DAYS
* IS nn DAYS AGO
* IS LAST WEEK
* IS THIS WEEK
* IS NEXT WEEK
* IS IN LAST nn WEEKS
* IS IN NEXT nn WEEKS
* IS nn WEEKS AGO
* IS LAST MONTH
* IS THIS MONTH
* IS NEXT MONTH
* IS IN LAST nn MONTHS
* IS IN NEXT nn MONTHS
* IS nn MONTHS AGO
* IS LAST QUARTER
* IS THIS QUARTER
* IS NEXT QUARTER
* IS IN LAST nn QUARTERS
* IS IN NEXT nn QUARTERS
* IS nn QUARTERS AGO
* IS LAST FISCAL QUARTER
* IS THIS FISCAL QUARTER
* IS NEXT FISCAL QUARTER
* IS IN LAST nn FISCAL QUARTERS
* IS IN NEXT nn FISCAL QUARTERS
* IS nn FISCAL QUARTERS AGO
* IS LAST YEAR
* IS THIS YEAR
* IS NEXT YEAR
* IS IN LAST nn YEARS
* IS IN NEXT nn YEARS
* IS nn YEARS AGO
* IS LAST FISCAL YEAR
* IS THIS FISCAL YEAR
* IS NEXT FISCAL YEAR
* IS IN LAST nn FISCAL YEARS
* IS IN NEXT nn FISCAL YEARS
* IS nn FISCAL YEARS AGO
* CROSSCARD(   )

* NOT can be put before a set of brackets, or before a single field operator operand expression, e.g.

  * NOT(name = 'People Inc' AND city = 'Whanganui')
  * NOT name = 'People Inc'
