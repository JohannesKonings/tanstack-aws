# Stage databases on the shared Aurora cluster

Workload stages share one Aurora cluster that is Data API only. A schema per stage inside `tanstackaws` keeps every stage in one database, and it forces the schema name to change with the stage.

Each workload stage gets its own **stage database**, named from the stage. Person tables live in schema `default` inside that database. The lifecycle Lambda connects to the **maintenance database** (`tanstackaws`) and creates the stage database there; deleting an ephemeral stack drops that stage database. Permanent stages keep theirs. `CREATE DATABASE` and `DROP DATABASE` each run as their own auto-commit Data API call.

Schema-per-stage was rejected because ephemeral stacks share a database with `main` and `prod`. Opening the cluster to direct connections was rejected because the cluster is Data API only.

Existing per-stage schemas in `tanstackaws` stay unused. The schema is never named `main`, so the `main` stage database and its schema are different identifiers.
