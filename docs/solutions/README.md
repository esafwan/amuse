# Solution Documentation

Searchable knowledge base of solved problems for the Amuse project (Frappe/ERPNext).

## Structure

Each solved problem is a single markdown file in a category directory, with YAML frontmatter for searchability.

```
docs/solutions/
  build-errors/           # Bench, pip, asset compilation errors
  test-failures/          # Test failures, flaky tests
  runtime-errors/         # Exceptions, crashes during execution
  performance-issues/     # Slow queries, memory issues, N+1 queries
  database-issues/        # Migration, MariaDB/PostgreSQL problems
  security-issues/        # Auth, authorization, CSRF, XSS
  ui-bugs/                # Frontend React, Desk UI issues
  integration-issues/     # External service, API, ERPNext integration
  logic-errors/           # Business logic bugs
  developer-experience/   # DX issues: workflow, tooling, dev setup
  workflow-issues/        # Development process, unclear practices
  best-practices/         # Patterns and practices to follow
  documentation-gaps/     # Missing or inadequate documentation
  patterns/
    critical-patterns.md  # Required Reading - must-follow patterns
    common-solutions.md   # Recurring solution patterns
```

## Searching

```bash
# Search by error message
grep -r "error phrase" docs/solutions/

# Search by tag
grep -r "tags:.*n-plus-one" docs/solutions/

# Search by component
grep -r "component: service_layer" docs/solutions/

# Search by module
grep -r "module: Pricing Intelligence" docs/solutions/
```

## Schema

All files use validated YAML frontmatter. See `.agent/skills/compound-docs/schema.yaml` for the full schema specification.
