/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { App } from "obsidian";
import { SubAgent } from "../agent/SubAgent";
import { LLMService, LLMMessage } from "../services/LLMService";
import { ListDirTool, ReadFileTool } from "../tools/FileTools";

export class ExploreAgent extends SubAgent {
    constructor(app: App, llm: LLMService) {
        super(app, llm, [new ListDirTool(app), new ReadFileTool(app)]);
    }

    async run(task: string): Promise<string> {
        this.context = []; // Reset context for new run
        this.context.push({ role: "user", content: `Task: ${task}\nExplore the vault to gather information.` });

        const systemPrompt = `You are an Explore Agent. Your goal is to navigate the file system and read files to gather context.
You have access to:
- list_dir: List files in a folder.
- read_file: Read file content.

Respond with JSON to use tools: { "tool": "name", "args": { ... } }
When you have enough information, respond with "DONE: <summary of findings>".
If you cannot find what you are looking for after a few steps, respond with "DONE: Could not find information."
`;

        let steps = 0;
        const maxSteps = 15;

        while (steps < maxSteps) {
            const messages: LLMMessage[] = [{ role: "system", content: systemPrompt }, ...this.context];
            const response = await this.callLLM(messages);
            this.context.push({ role: "assistant", content: response });

            if (response.startsWith("DONE:")) {
                return response.substring(5).trim();
            }

            // Try to parse tool call
            let toolCallStr = "";
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                toolCallStr = jsonMatch[0];
            }

            if (toolCallStr) {
                try {
                    const toolCall = JSON.parse(toolCallStr);
                    if (toolCall.tool === "list_dir") {
                        const result = await this.tools[0].execute(toolCall.args);
                        this.context.push({ role: "user", content: `Observation: ${JSON.stringify(result)}` });
                    } else if (toolCall.tool === "read_file") {
                        const result = await this.tools[1].execute(toolCall.args);
                        this.context.push({ role: "user", content: `Observation: ${result.substring(0, 2000)}... (truncated)` });
                    } else {
                        this.context.push({ role: "user", content: "Invalid tool. Available tools: list_dir, read_file." });
                    }
                } catch (e) {
                    this.context.push({ role: "user", content: "Error parsing tool call or executing tool. Please use valid JSON." });
                }
            } else {
                // If no tool call and no DONE, prompt again
                this.context.push({ role: "user", content: "Please use a tool or say DONE." });
            }
            steps++;
        }

        return "Exploration timed out.";
    }
}
