/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { App, TFile } from "obsidian";
import { Tool } from "./Tool";

export class SearchFilesTool implements Tool {
    name = "search_files";
    description = "Searches for files containing specific text. Args: { query: string }";
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async execute(args: { query: string }): Promise<string[]> {
        const files = this.app.vault.getFiles();
        const results: string[] = [];

        for (const file of files) {
            const content = await this.app.vault.read(file);
            if (content.toLowerCase().includes(args.query.toLowerCase())) {
                results.push(file.path);
            }
        }
        return results;
    }

    getSchema() {
        return {
            type: "object",
            properties: {
                query: { type: "string" }
            },
            required: ["query"]
        };
    }
}
