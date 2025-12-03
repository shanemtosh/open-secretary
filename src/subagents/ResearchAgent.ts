/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { App } from "obsidian";
import { SubAgent } from "../agent/SubAgent";
import { LLMService, LLMMessage } from "../services/LLMService";
import { ReadFileTool } from "../tools/FileTools";
import { SearchFilesTool } from "../tools/SearchTool";

export class ResearchAgent extends SubAgent {
    private researchModel: string;

    constructor(app: App, llm: LLMService, researchModel: string) {
        super(app, llm, [new SearchFilesTool(app), new ReadFileTool(app)]);
        this.researchModel = researchModel;
    }

    updateModel(model: string) {
        this.researchModel = model;
    }

    async run(task: string): Promise<string> {
        this.context = [];
        this.context.push({ role: "user", content: `Task: ${task}\nSearch the vault to find relevant information.` });

        const systemPrompt = `You are a Research Agent. Your goal is to find specific information within the vault.
You have access to:
- search_files: Search for files by content or name.
- read_file: Read file content.

Respond with JSON to use tools: { "tool": "name", "args": { ... } }
When you have found the information, respond with "DONE: <summary of findings>".
If you cannot find the information, respond with "DONE: Could not find information."
`;

        let steps = 0;
        const maxSteps = 15;

        while (steps < maxSteps) {
            const messages: LLMMessage[] = [{ role: "system", content: systemPrompt }, ...this.context];
            // Create a temporary LLM service or override model for this call if possible.
            // Since LLMService is shared, we might need a way to specify model per call or create a new instance.
            // For now, let's assume we create a new LLMService instance for the research agent if the model differs,
            // OR we update the LLMService to support per-request model.
            // Given the current architecture, let's instantiate a new LLMService for the research agent if needed,
            // but we passed the shared one.
            // BETTER APPROACH: The ResearchAgent should have its own LLMService instance or the shared one should allow model override.
            // Let's modify LLMService to allow model override in complete().
            // Checking LLMService... assuming it doesn't support it yet.
            // Let's just create a new LLMService for the ResearchAgent using the API key from the shared one.

            // Actually, we passed `llm` to super. Let's ignore that and create a local one?
            // No, let's use the shared one but we need to change the model.
            // Let's assume we can't easily change the shared LLM's model without affecting others.
            // So, ResearchAgent should probably manage its own LLMService.

            // Let's update the constructor to take apiKey instead of LLMService?
            // Or just create a new LLMService using the apiKey from the passed LLMService (if exposed).
            // LLMService has public apiKey? Let's check.
            // Assuming it does or we can pass it.

            // For now, let's try to use the passed LLMService but with a model override if supported.
            // If not, we'll need to refactor.
            // Let's assume LLMService.complete takes options?
            // Looking at previous files, LLMService.complete(messages).

            // Let's refactor ResearchAgent to create its own LLMService.
            // We need the API key.
            // Agent passes `this.llm`.

            // Let's change ResearchAgent constructor to take apiKey.
            // But SubAgent expects `llm`.

            // Let's just update `callLLM` in SubAgent to support model override?
            // Or override `callLLM` in ResearchAgent.

            // Let's assume we can access `this.llm.apiKey`.
            // We will create a new LLMService instance for this request.
            // We need to import LLMService.

            const researchLLM = new LLMService(this.llm.apiKey, this.researchModel);
            const response = await researchLLM.complete(messages);
            this.context.push({ role: "assistant", content: response });

            if (response.startsWith("DONE:")) {
                return response.substring(5).trim();
            }

            let toolCallStr = "";
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                toolCallStr = jsonMatch[0];
            }

            if (toolCallStr) {
                try {
                    const toolCall = JSON.parse(toolCallStr);
                    if (toolCall.tool === "search_files") {
                        const result = await this.tools[0].execute(toolCall.args);
                        this.context.push({ role: "user", content: `Observation: ${JSON.stringify(result)}` });
                    } else if (toolCall.tool === "read_file") {
                        const result = await this.tools[1].execute(toolCall.args);
                        this.context.push({ role: "user", content: `Observation: ${result.substring(0, 2000)}... (truncated)` });
                    } else {
                        this.context.push({ role: "user", content: "Invalid tool. Available tools: search_files, read_file." });
                    }
                } catch (e) {
                    this.context.push({ role: "user", content: "Error parsing tool call or executing tool. Please use valid JSON." });
                }
            } else {
                this.context.push({ role: "user", content: "Please use a tool or say DONE." });
            }
            steps++;
        }

        return "Research timed out.";
    }
}
