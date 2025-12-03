/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { Agent } from "./agent/Agent";
import { ReadFileTool, WriteFileTool, DeleteFileTool, MoveFileTool, ListDirTool, CreateDirTool, EditFileTool, AppendFileTool } from "./tools/FileTools";
import { SearchFilesTool } from "./tools/SearchTool";
import { ChatView, VIEW_TYPE_CHAT } from "./ui/ChatView";

interface AgentPluginSettings {
    openRouterApiKey: string;
    model: string;
    availableModels: string;
    contextFile: string;
    historyFolder: string;
    researchModel: string;
}

const DEFAULT_SETTINGS: AgentPluginSettings = {
    openRouterApiKey: "",
    model: "x-ai/grok-4-fast",
    availableModels: "x-ai/grok-4-fast,anthropic/claude-sonnet-4.5,anthropic/claude-haiku-4.5",
    contextFile: "AGENTS.md",
    historyFolder: ".obsidian/plugins/open-secretary/history",
    researchModel: "perplexity/sonar"
}

export default class AgentPlugin extends Plugin {
    settings: AgentPluginSettings;
    agent: Agent;

    async onload() {
        await this.loadSettings();

        this.agent = new Agent(this.app, this.settings.openRouterApiKey, this.settings.model, this.settings.contextFile, this.settings.historyFolder, this.settings.researchModel);
        this.agent.availableModels = this.settings.availableModels.split(",").map(m => m.trim());

        // Register Tools
        this.agent.registerTool(new ReadFileTool(this.app));
        this.agent.registerTool(new WriteFileTool(this.app));
        this.agent.registerTool(new DeleteFileTool(this.app));
        this.agent.registerTool(new MoveFileTool(this.app));
        this.agent.registerTool(new ListDirTool(this.app));
        this.agent.registerTool(new CreateDirTool(this.app));
        this.agent.registerTool(new EditFileTool(this.app));
        this.agent.registerTool(new AppendFileTool(this.app));
        this.agent.registerTool(new SearchFilesTool(this.app));

        this.registerView(
            VIEW_TYPE_CHAT,
            (leaf) => new ChatView(leaf, this.agent)
        );

        this.addRibbonIcon("bot", "Open Agent Chat", () => {
            this.activateView();
        });

        this.addSettingTab(new AgentSettingTab(this.app, this));

        this.addCommand({
            id: "open-chat",
            name: "Open Chat",
            callback: () => {
                this.activateView();
            }
        });
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf = workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0];

        if (!leaf) {
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({ type: VIEW_TYPE_CHAT, active: true });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.agent.updateSettings(this.settings.openRouterApiKey, this.settings.model, this.settings.contextFile, this.settings.historyFolder, this.settings.researchModel);
        this.agent.availableModels = this.settings.availableModels.split(",").map(m => m.trim());
    }
}

class AgentSettingTab extends PluginSettingTab {
    plugin: AgentPlugin;

    constructor(app: App, plugin: AgentPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("OpenRouter API Key")
            .setDesc("Enter your OpenRouter API key")
            .addText(text => text
                .setPlaceholder("sk-or-...")
                .setValue(this.plugin.settings.openRouterApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.openRouterApiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Model")
            .setDesc("Enter the model ID (e.g., anthropic/claude-3.5-sonnet)")
            .addText(text => text
                .setPlaceholder("anthropic/claude-3.5-sonnet")
                .setValue(this.plugin.settings.model)
                .onChange(async (value) => {
                    this.plugin.settings.model = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Available Models")
            .setDesc("Comma-separated list of models to show in the dropdown")
            .addTextArea(text => text
                .setPlaceholder("anthropic/claude-3.5-sonnet, openai/gpt-4o")
                .setValue(this.plugin.settings.availableModels)
                .onChange(async (value) => {
                    this.plugin.settings.availableModels = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Context File")
            .setDesc("The file used for vault context (default: AGENTS.md)")
            .addText(text => text
                .setPlaceholder("AGENTS.md")
                .setValue(this.plugin.settings.contextFile)
                .onChange(async (value) => {
                    this.plugin.settings.contextFile = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("History Folder")
            .setDesc("Folder to save chat history (default: Agent History)")
            .addText(text => text
                .setPlaceholder("Agent History")
                .setValue(this.plugin.settings.historyFolder)
                .onChange(async (value) => {
                    this.plugin.settings.historyFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Research Model")
            .setDesc("Model used by the Research Agent for web search (requires OpenRouter)")
            .addDropdown(dropdown => dropdown
                .addOption("perplexity/sonar", "Perplexity Sonar (Default)")
                .addOption("perplexity/sonar-pro-search", "Perplexity Sonar Pro (Heavy)")
                .setValue(this.plugin.settings.researchModel)
                .onChange(async (value) => {
                    this.plugin.settings.researchModel = value;
                    await this.plugin.saveSettings();
                }));
    }
}
