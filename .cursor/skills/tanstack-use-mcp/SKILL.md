---
name: tanstack-use-mcp
description: Instructs the agent to consult the TanStack MCP (user-tanstack) for all TanStack-related actions. Use when working with TanStack Query, Router, Table, Form, Start, Store, or any TanStack library—implementing features, debugging, answering API or usage questions, or scaffolding TanStack applications.
---

# TanStack MCP Usage

## When to Apply

Apply this skill whenever the task involves TanStack in any form:

- TanStack Query, Router, Table, Form, Start, Store, or other TanStack libraries
- Implementing or changing TanStack-based code
- Debugging TanStack usage
- Answering API, usage, or how-to questions about TanStack
- Scaffolding or creating a new TanStack application

## Instructions

1. **Call the TanStack MCP first.** For any TanStack-related task (code, docs, APIs, scaffolding), use the **user-tanstack** MCP before implementing or answering. Use `call_mcp_tool` with `server: "user-tanstack"` and the appropriate tool.

2. **Choose the right tool:**
   - **tanstack_search_docs** – How-to or API questions; search by query; optional `library`, `framework`, `limit`.
   - **tanstack_doc** – When you know the library and doc path; requires `library` and `path`; optional `version`.
   - **tanstack_list_libraries** – Overview of TanStack libraries; optional `group` (state, headlessUI, performance, tooling).
   - **tanstack_ecosystem** – Integrations or partners; optional `category`, `library`.
   - **createTanStackApplication** – Creating a new TanStack app; use with **listTanStackAddOns** for add-on options.

3. **Then implement or answer.** Use the MCP result as up-to-date context before writing code or giving answers.

## Tool reference

| Tool                      | Use for                                                         |
| ------------------------- | --------------------------------------------------------------- |
| tanstack_search_docs      | Search docs (query; optional library, framework, limit)         |
| tanstack_doc              | Fetch a doc page (library, path; optional version)              |
| tanstack_list_libraries   | List libraries (optional group)                                 |
| tanstack_ecosystem        | Ecosystem partners (optional category, library)                 |
| createTanStackApplication | Create new app (framework, projectName, cwd, addOns, targetDir) |
| listTanStackAddOns        | List add-ons for app creation                                   |

Always call the MCP before implementing or answering TanStack-related requests.
