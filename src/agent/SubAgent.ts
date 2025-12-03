/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { App } from "obsidian";
import { LLMService, LLMMessage } from "../services/LLMService";
import { Tool } from "../tools/Tool";

export abstract class SubAgent {
    protected app: App;
    protected llm: LLMService;
    protected tools: Tool[];
    protected context: LLMMessage[];

    constructor(app: App, llm: LLMService, tools: Tool[]) {
        this.app = app;
        this.llm = llm;
        this.tools = tools;
        this.context = [];
    }

    abstract run(task: string): Promise<string>;

    protected async callLLM(messages: LLMMessage[]): Promise<string> {
        return this.llm.complete(messages);
    }
}
