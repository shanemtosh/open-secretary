# OpenSecretary

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

An autonomous AI agent system for [Obsidian](https://obsidian.md). Interact with your vault using an intelligent assistant that can read, write, search, and organize your notes.

**Website:** [OpenSecretary.com](https://opensecretary.com)

## Features

- **Autonomous Agent** - AI-powered assistant that understands context and executes tasks
- **File Operations** - Read, write, edit, and organize files in your vault
- **Smart Search** - Semantic search across your notes
- **Sub-Agents** - Specialized agents for research, writing, and exploration
- **Flexible Models** - Support for multiple LLM providers via OpenRouter

## Installation

1. Download the latest release from the [Releases](https://github.com/opensecretary/open-secretary/releases) page
2. Extract to your Obsidian plugins folder: `.obsidian/plugins/open-secretary/`
3. Enable the plugin in Obsidian Settings → Community Plugins
4. Configure your OpenRouter API key in the plugin settings

## Usage

1. Click the bot icon in the ribbon or use the command palette to open the chat
2. Ask questions about your vault or request tasks to be performed
3. The agent will read relevant files, execute actions, and respond

## License

### Community Edition (Open Source)

This project is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)** for free use, modification, and distribution by the community. See the [LICENSE](LICENSE) file for the complete license text.

**This means:**
- You can use, modify, and share it freely
- Ideal for personal use, hobby projects, and open source projects
- Any derivatives (including SaaS/network use) must also be AGPLv3 and share source code
- You must provide access to the source code for any network-accessible deployment

### Commercial License

For proprietary use, closed-source derivatives, or commercial SaaS without AGPL obligations, we offer a **paid commercial license**. This provides flexibility for businesses while supporting project development.

**Commercial licensing is ideal if you want to:**
- Use OpenSecretary in a closed-source product
- Offer OpenSecretary as part of a commercial SaaS without source disclosure
- Avoid the copyleft requirements of AGPLv3

**Pricing and Terms:** Custom plans based on your needs. Contact us at [shane@mto.sh](mailto:shane@mto.sh) for details and quotes.

## Contributing

We welcome contributions! Before submitting a pull request:

1. **Review and accept the [CLA](CLA.md)** - By submitting a PR, you agree to grant us rights for dual-licensing
2. **Include copyright headers** - Ensure your code includes the standard copyright header
3. **Follow our [CONTRIBUTING.md](CONTRIBUTING.md) guidelines**

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## Development

```bash
# Clone the repository
git clone https://github.com/opensecretary/open-secretary.git
cd open-secretary

# Install dependencies
npm install

# Development build (with watch)
npm run dev

# Production build
npm run build
```

## Support

- [Documentation](https://opensecretary.com/docs)
- [Issue Tracker](https://github.com/opensecretary/open-secretary/issues)
- [Discussions](https://github.com/opensecretary/open-secretary/discussions)

---

**[OpenSecretary](https://opensecretary.com)** - Copyright (c) 2025 McIntosh Media LLC. Released under [AGPLv3](LICENSE) for open source use. [Commercial licenses](mailto:shane@mto.sh) available.
