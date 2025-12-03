/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { App, TFile } from "obsidian";
import { SubAgent } from "../agent/SubAgent";
import { LLMService, LLMMessage } from "../services/LLMService";
import { ReadFileTool, WriteFileTool, AppendFileTool } from "../tools/FileTools";

export class WriterAgent extends SubAgent {
    private styleGuidePath = "style_guide.md";

    constructor(app: App, llm: LLMService) {
        super(app, llm, [new ReadFileTool(app), new WriteFileTool(app), new AppendFileTool(app)]);
    }

    async run(task: string): Promise<string> {
        this.context = [];

        // Load Style Guide
        let styleGuide = "";
        try {
            const file = this.app.vault.getAbstractFileByPath(this.styleGuidePath);
            if (file instanceof TFile) {
                styleGuide = await this.app.vault.read(file);
            }
        } catch (e) {
            // No style guide yet
        }

        this.context.push({ role: "user", content: `Task: ${task}\nDraft content based on the request.` });

        const systemPrompt = `You are a Writer Agent. Your goal is to draft content (markdown files) for the user.
You have access to:
- read_file: Read existing files for context.
- write_file: Write new content to a file.
- append_file: Append text to a file.

STYLE GUIDE:
${styleGuide ? styleGuide : "No style guide defined yet."}

INSTRUCTIONS:
1. If the task is to "Learn style from [file]", read that file, analyze the writing style (tone, formatting, vocabulary), and append a summary of the style to '${this.styleGuidePath}'.
2. If the task is to draft content, follow the Style Guide above.

Respond with JSON to use tools: { "tool": "name", "args": { ... } }
When you have finished, respond with "DONE: <summary>".
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

            let toolCallStr = "";
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                toolCallStr = jsonMatch[0];
            }

            if (toolCallStr) {
                try {
                    const toolCall = JSON.parse(toolCallStr);
                    if (toolCall.tool === "read_file") {
                        const result = await this.tools[0].execute(toolCall.args);
                        this.context.push({ role: "user", content: `Observation: ${result.substring(0, 2000)}... (truncated)` });
                    } else if (toolCall.tool === "write_file") {
                        const result = await this.tools[1].execute(toolCall.args);
                        this.context.push({ role: "user", content: `Observation: ${JSON.stringify(result)}` });
                    } else if (toolCall.tool === "append_file") {
                        const result = await this.tools[2].execute(toolCall.args);
                        this.context.push({ role: "user", content: `Observation: ${JSON.stringify(result)}` });
                    } else {
                        this.context.push({ role: "user", content: "Invalid tool. Available tools: read_file, write_file, append_file." });
                    }
                } catch (e) {
                    this.context.push({ role: "user", content: "Error parsing tool call or executing tool. Please use valid JSON." });
                }
            } else {
                this.context.push({ role: "user", content: "Please use a tool or say DONE." });
            }
            steps++;
        }

        return "Writing timed out.";
    }
}
