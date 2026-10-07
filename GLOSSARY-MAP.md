# Glossary Map

Per-context glossaries for this monorepo. Read the glossary for each context relevant to your work.

| Context       | Glossary                         | ADR      |
| ------------- | -------------------------------- | -------- |
| root          | GLOSSARY.md                      | docs/adr |
| account-setup | apps/account-setup/GLOSSARY.md   | docs/adr |
| tanstack-ds   | packages/tanstack-ds/GLOSSARY.md | docs/adr |
| webapp-admin  | GLOSSARY.md                      | docs/adr |

## Relationships

- **account-setup → root**: Account setup publishes shared Aurora metadata that workload stacks resolve at deploy time.
