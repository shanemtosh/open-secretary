# Contributing to OpenSecretary

Thank you for your interest in contributing to OpenSecretary! We welcome contributions from the community to help make this the best AI agent for Obsidian.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/open-secretary.git
   cd open-secretary
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start development build**:
   ```bash
   npm run dev
   ```

## Development Guidelines

### Code Style

We strive for a clean, maintainable codebase.

- **No `any`**: Avoid using `any` types. Use proper interfaces and types.
- **No "Slop"**: Avoid excessive comments (internal monologue), redundant defensive checks, or dead code.
- **Linting**: Ensure your code passes linting checks (if configured).

### Copyright Headers

All source files must include the copyright header:

```typescript
/**
 * Copyright (c) 2025 Mimir LLC
 *
 * This file is part of OpenSecretary.
 * Licensed under MIT - see LICENSE file for details.
 */
```

### Pull Request Process

1. Create a new branch for your feature or fix: `git checkout -b feature/my-feature`
2. Ensure your code includes the copyright header
3. Commit your changes with clear, descriptive messages
4. Push to your fork and submit a Pull Request to the `main` branch
5. Describe your changes in detail in the PR description

## Reporting Bugs

If you find a bug, please open an issue on GitHub with:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Your environment (Obsidian version, OS)

## Feature Requests

We welcome feature requests! Please open an issue describing:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## License

This project is licensed under the [MIT License](LICENSE). By contributing, you agree that your contributions will be licensed under the same terms.
