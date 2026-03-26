### Amuse

App for Running parks, themeparks and more.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch version-16
bench install-app amuse
```

### Skills

This project includes a machine-readable skill directory at `skills/` that documents features, UI patterns, design system elements, and developer workflows in a structured format.

See `skills/_index.json` for the full catalog, or browse individual skill folders for detailed documentation.

Skills are designed to be consumed by both developers and AI agents working on this codebase.

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/amuse
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

agpl-3.0
