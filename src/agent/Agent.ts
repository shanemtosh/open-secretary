/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { App, Notice, TFile, moment, MarkdownView } from "obsidian";
import { LLMService, LLMMessage } from "../services/LLMService";
import { Tool } from "../tools/Tool";
import { SubAgent } from "./SubAgent";
import { UpdatePlanTool } from "../tools/PlanTool";
import { RoutineManager } from "../services/RoutineManager";
import { SubAgentTool } from "../tools/SubAgentTool";
import { ExploreAgent } from "../subagents/ExploreAgent";
import { ResearchAgent } from "../subagents/ResearchAgent";
import { WriterAgent } from "../subagents/WriterAgent";

export type AgentMode = "low" | "high" | "plan";
export type OutputStyle = "default" | "concise" | "explanatory";

export class Agent {
    public app: App;
    private llm: LLMService;
    private tools: Map<string, Tool>;
    private subAgents: Map<string, SubAgent>;
    public availableModels: string[] = [];
    public history: LLMMessage[];
    private abortController: AbortController | null = null;
    public plan: string = "";
    public routineManager: RoutineManager;
    public contextFile: string;
    public historyFolder: string;
    public mode: AgentMode = "high";
    public apiKey: string;
    public modelName: string;
    public researchModel: string;
    public transcriptionModel: string;
    public voiceAutoSend: boolean;
    public outputStyle: OutputStyle;

    public onToolStart: (toolName: string, args: Record<string, unknown>) => void = () => { };
    public onToolFinish: (toolName: string, result: unknown) => void = () => { };
    public onMessage: (content: string) => void = () => { };
    public onPlanUpdate: (plan: string) => void = () => { };
    public onApprovalRequest: (toolName: string, args: Record<string, unknown>) => Promise<boolean> = async () => true;
    public onModeChange: (mode: AgentMode) => void = () => { };

    constructor(app: App, apiKey: string, model: string, contextFile: string, historyFolder: string, researchModel: string, transcriptionModel: string, voiceAutoSend: boolean, outputStyle: OutputStyle = "default") {
        this.app = app;
        this.apiKey = apiKey;
        this.modelName = model;
        this.researchModel = researchModel;
        this.transcriptionModel = transcriptionModel;
        this.voiceAutoSend = voiceAutoSend;
        this.outputStyle = outputStyle;
        this.llm = new LLMService(apiKey, model);
        this.tools = new Map();
        this.subAgents = new Map();
        this.history = [];
        this.routineManager = new RoutineManager(app);
        this.contextFile = contextFile;
        this.historyFolder = historyFolder;

        // Register default tools
        this.registerTool(new UpdatePlanTool(this));
        this.registerTool(new SubAgentTool(this));

        // Register default subagents
        this.registerSubAgent("ExploreAgent", new ExploreAgent(app, this.llm));
        this.registerSubAgent("ResearchAgent", new ResearchAgent(app, this.llm, this.researchModel));
        this.registerSubAgent("WriterAgent", new WriterAgent(app, this.llm));
    }

    updateSettings(apiKey: string, model: string, contextFile: string, historyFolder: string, researchModel: string, transcriptionModel: string, voiceAutoSend: boolean, outputStyle: OutputStyle = "default") {
        this.apiKey = apiKey;
        this.modelName = model;
        this.researchModel = researchModel;
        this.transcriptionModel = transcriptionModel;
        this.voiceAutoSend = voiceAutoSend;
        this.outputStyle = outputStyle;
        this.llm.updateSettings(apiKey, model);
        this.contextFile = contextFile;
        this.historyFolder = historyFolder;

        // Update ResearchAgent with new model
        const researchAgent = this.getSubAgent("ResearchAgent");
        if (researchAgent instanceof ResearchAgent) {
            researchAgent.updateModel(researchModel);
        }
    }

    setMode(mode: AgentMode) {
        this.mode = mode;
        this.onModeChange(mode);
    }

    registerTool(tool: Tool) {
        this.tools.set(tool.name, tool);
    }

    registerSubAgent(name: string, subAgent: SubAgent) {
        this.subAgents.set(name, subAgent);
    }

    getSubAgent(name: string): SubAgent | undefined {
        return this.subAgents.get(name);
    }

    getAvailableSubAgents(): string[] {
        return Array.from(this.subAgents.keys());
    }

    public currentSessionPath: string | null = null;

    async saveSession() {
        if (this.history.length === 0) return;

        let path = this.currentSessionPath;
        if (!path) {
            const timestamp = moment().format("YYYY-MM-DD_HH-mm-ss");
            const filename = `session_${timestamp}.json`;
            path = `${this.historyFolder}/${filename}`;
            this.currentSessionPath = path;
        }

        try {
            if (!(await this.app.vault.adapter.exists(this.historyFolder))) {
                await this.app.vault.adapter.mkdir(this.historyFolder);
            }
            await this.app.vault.adapter.write(path, JSON.stringify(this.history, null, 2));
        } catch (error) {
            console.error("Failed to save session:", error);
            new Notice("Failed to save session.");
        }
    }

    async loadSession(path: string) {
        try {
            if (await this.app.vault.adapter.exists(path)) {
                const content = await this.app.vault.adapter.read(path);
                this.history = JSON.parse(content);
                this.currentSessionPath = path;
                new Notice(`Session loaded from ${path}`);
            } else {
                new Notice(`Session file not found: ${path}`);
            }
        } catch (error) {
            console.error("Failed to load session:", error);
            new Notice("Failed to load session.");
        }
    }

    async listSessions(): Promise<string[]> {
        try {
            if (!(await this.app.vault.adapter.exists(this.historyFolder))) {
                return [];
            }
            const result = await this.app.vault.adapter.list(this.historyFolder);
            const files = result.files.filter(path => path.endsWith(".json"));
            // Sort by name desc (newest first)
            files.sort((a, b) => b.localeCompare(a));
            return files;
        } catch (error) {
            console.error("Failed to list sessions:", error);
            return [];
        }
    }

    async clearHistory() {
        await this.saveSession();
        this.history = [];
        this.currentSessionPath = null;
        this.setPlan("");
    }

    setPlan(plan: string) {
        this.plan = plan;
        this.onPlanUpdate(plan);
    }

    stop() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    async listRoutines(): Promise<string[]> {
        return await this.routineManager.listRoutines();
    }

    async createRoutine(name: string, content: string): Promise<void> {
        await this.routineManager.createRoutine(name, content);
    }

    async deleteRoutine(name: string): Promise<boolean> {
        return await this.routineManager.deleteRoutine(name);
    }

    async runRoutine(routineName: string, userMessage: string): Promise<string> {
        const content = await this.routineManager.getRoutineContent(routineName);
        if (!content) {
            return `Error: Routine '${routineName}' not found.`;
        }

        const constructedMessage = `[ROUTINE: ${routineName}]\n\nINSTRUCTIONS:\n${content}\n\nUSER CONTEXT:\n${userMessage}`;
        return await this.chat(constructedMessage);
    }

    async runInitRoutine(): Promise<string> {
        const prompt = `
You are initializing the vault context.
Your goal is to explore the vault and create a comprehensive guide in '${this.contextFile}'.
This file will be used by you in the future to understand the project structure and conventions.

Steps:
1. List the files in the root directory.
2. Read any README or documentation files.
3. Explore key directories to understand the project structure.
4. Write a detailed summary to '${this.contextFile}' including:
    - Project Overview
    - Directory Structure
    - Key Files
    - Conventions (if observed)

Start by listing the root directory.
`;
        return await this.chat(prompt);
    }

    async chat(userMessage: string): Promise<string> {
        this.abortController = new AbortController();
        this.history.push({ role: "user", content: userMessage });

        // Load context file if it exists
        let contextContent = "";
        try {
            const file = this.app.vault.getAbstractFileByPath(this.contextFile);
            if (file instanceof TFile) {
                contextContent = await this.app.vault.read(file);
            }
        } catch (e) {
            console.warn("Failed to read context file:", e);
        }

        let modeInstructions = "";
        if (this.mode === "plan") {
            modeInstructions = `
MODE: PLAN
- You are in PLAN mode.
- You MUST NOT use any tools that modify files (write_file, edit_file, append_file, delete_file, move_file, create_dir).
- You MAY use read-only tools (read_file, list_dir, search_files) to gather information.
- Your primary goal is to create and update a detailed plan using \`update_plan\`.
- Once the plan is complete, inform the user they can switch to High or Low mode to execute it.
`;
        } else if (this.mode === "low") {
            modeInstructions = `
MODE: LOW AUTONOMY
- You are in LOW autonomy mode.
- You can use all tools, but destructive actions will require user approval.
- Proceed with your task step-by-step.
`;
        } else {
            modeInstructions = `
MODE: HIGH AUTONOMY
- You are in HIGH autonomy mode.
- You have full permission to execute tools to complete your task.
`;
        }

        // Output style instructions
        let outputStyleInstructions = "";
        if (this.outputStyle === "concise") {
            outputStyleInstructions = `
OUTPUT STYLE: CONCISE
- Keep responses brief and to the point.
- Avoid unnecessary explanations or elaboration.
- Use bullet points when listing multiple items.
- Skip pleasantries and get straight to the answer.
`;
        } else if (this.outputStyle === "explanatory") {
            outputStyleInstructions = `
OUTPUT STYLE: EXPLANATORY
- Provide detailed explanations for your actions and reasoning.
- Include context and background information when relevant.
- Explain the "why" behind decisions, not just the "what".
- Help the user understand the process and learn from it.
`;
        }

        // Get active file context
        let activeFileContext = "";
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView?.file) {
            const activeFilePath = activeView.file.path;
            const selection = activeView.editor?.getSelection();
            activeFileContext = `\nCURRENTLY OPEN FILE: ${activeFilePath}`;
            if (selection && selection.trim().length > 0) {
                activeFileContext += `\nSELECTED TEXT:\n\`\`\`\n${selection}\n\`\`\``;
            }
        }

        const systemPrompt = `You are an intelligent agent within Obsidian.
You have access to the following tools:
${Array.from(this.tools.values()).map(t => `- ${t.name}: ${t.description}`).join("\n")}

CURRENT DATE/TIME: ${moment().format("YYYY-MM-DD HH:mm:ss")}

${contextContent ? `CONTEXT FROM VAULT (${this.contextFile}):\n${contextContent}\n` : ""}${activeFileContext}

${modeInstructions}
${outputStyleInstructions}

GOAL:
You are an autonomous agent capable of performing complex tasks.
When presented with a complex request, you should:
1. Initialize your plan using the \`update_plan\` tool.
2. EXECUTE the plan one step at a time.
3. Update your plan using \`update_plan\` as you complete steps (mark them as done).
4. VERIFY your progress.

MEMORY MANAGEMENT:
- You have a long-term memory file at '${this.contextFile}'.
- If you learn something important about the user, the project, or conventions, use 'append_file' to add it to this file.
- If the user explicitly asks you to remember something (via /memory), you MUST update this file using 'append_file'.

TOOL USAGE:
To use a tool, you MUST respond with a JSON object in the following format ONLY:
\`\`\`json
{ "tool": "tool_name", "args": { ... } }
\`\`\`

IMPORTANT RULES:
- Do NOT use XML tags like <function_calls>.
- Do NOT output multiple tool calls in one message.
- Do NOT include any other text with the tool call.
- If you don't need a tool, just respond with your message.
- Use \`update_plan\` frequently to keep the user informed of your progress.
    `;

        const messages: LLMMessage[] = [
            { role: "system", content: systemPrompt },
            ...this.history
        ];

        try {
            if (this.abortController?.signal.aborted) throw new Error("Aborted");
            const response = await this.llm.complete(messages);
            if (this.abortController?.signal.aborted) throw new Error("Aborted");

            this.onMessage(response);
            this.history.push({ role: "assistant", content: response });

            // Robust tool parsing logic
            let toolCallStr = "";

            // Priority 1: Check for JSON code block
            const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (codeBlockMatch) {
                toolCallStr = codeBlockMatch[1];
            } else {
                // Priority 2: Check for raw JSON object
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    toolCallStr = jsonMatch[0];
                } else {
                    // Priority 3: Fallback for XML-style tags (if model ignores instructions)
                    const xmlMatch = response.match(/<function_calls>\s*([\s\S]*?)\s*<\/function_calls>/);
                    if (xmlMatch) {
                        const content = xmlMatch[1].trim();
                        // Try to find JSON inside XML
                        const innerJsonMatch = content.match(/\{[\s\S]*\}/);
                        if (innerJsonMatch) {
                            toolCallStr = innerJsonMatch[0];
                        } else {
                            // Ambiguous content, try to use as is
                            toolCallStr = content;
                        }
                    }
                }
            }

            if (toolCallStr) {
                try {
                    const cleanedStr = toolCallStr.trim();
                    const toolCall = JSON.parse(cleanedStr);
                    if (toolCall.tool) {
                        const tool = this.tools.get(toolCall.tool);
                        if (!tool) {
                            console.warn(`Tool '${toolCall.tool}' not found in registered tools`);
                        } else {
                            const destructiveTools = ["write_file", "edit_file", "append_file", "delete_file", "move_file", "create_dir"];
                            const isDestructive = destructiveTools.includes(tool.name);

                            if (this.mode === "plan" && isDestructive) {
                                const result = "Error: You are in PLAN mode. Destructive actions are not allowed. Switch to HIGH or LOW mode to execute.";
                                this.onToolFinish(tool.name, result);
                                const observation = `Observation: ${JSON.stringify(result)} `;
                                this.history.push({ role: "user", content: observation });
                                return this.chat("Acknowledged.");
                            }

                            if (this.mode === "low" && isDestructive) {
                                const approved = await this.onApprovalRequest(tool.name, toolCall.args);
                                if (!approved) {
                                    const result = "User denied this action.";
                                    this.onToolFinish(tool.name, result);
                                    const observation = `Observation: ${JSON.stringify(result)} `;
                                    this.history.push({ role: "user", content: observation });
                                    return this.chat("User denied the action. I should ask for alternative instructions or stop.");
                                }
                            }

                            this.onToolStart(tool.name, toolCall.args);

                            let result;
                            try {
                                result = await tool.execute(toolCall.args);
                            } catch (toolError: unknown) {
                                const errorMessage = toolError instanceof Error ? toolError.message : String(toolError);
                                result = `Error executing tool ${tool.name}: ${errorMessage}`;
                            }

                            this.onToolFinish(tool.name, result);

                            const observation = `Observation: ${JSON.stringify(result)} `;
                            this.history.push({ role: "user", content: observation });

                            return this.chat("Proceed with the observation.");
                        }
                    }
                } catch (parseError) {
                    console.warn("Failed to parse tool call JSON:", parseError);
                }
            }

            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage === "Aborted") {
                return "Request cancelled.";
            }
            new Notice("Error communicating with Agent: " + errorMessage);
            return "Error: " + errorMessage;
        } finally {
            this.abortController = null;
        }
    }

    async searchFiles(query: string): Promise<string[]> {
        const files = this.app.vault.getFiles();
        return files
            .filter(file => file.path.toLowerCase().includes(query.toLowerCase()))
            .map(file => file.path)
            .slice(0, 10);
    }

    async transcribeAudio(audioBase64: string, format: "wav" | "mp3" | "ogg" | "webm"): Promise<string> {
        return await this.llm.transcribeAudio(audioBase64, format, this.transcriptionModel);
    }

    async compactMemory() {
        if (this.history.length === 0) return;

        const systemPrompt = `You are an expert at summarizing conversations for an AI agent.
Your goal is to create a concise summary of the conversation history that preserves:
1. The user's main objectives and current context.
2. Key decisions made.
3. Important file paths or resources referenced.
4. The current state of any ongoing tasks.

Output ONLY the summary. Do not include any other text.`;

        const messages: LLMMessage[] = [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Please summarize the following conversation history so I can clear my context but keep working:\n\n" + JSON.stringify(this.history) }
        ];

        try {
            const summary = await this.llm.complete(messages);

            // Reset history but keep the summary as the first message
            this.history = [
                { role: "assistant", content: `[CONTEXT SUMMARY]\n${summary}` }
            ];

            this.setPlan("");

            return summary;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice("Failed to compact memory: " + errorMessage);
            throw error;
        }
    }
}
