/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { App, TFile, TFolder } from "obsidian";

export class RoutineManager {
    private app: App;
    private routineFolder: string = "Agent Routines";

    constructor(app: App) {
        this.app = app;
    }

    async listRoutines(): Promise<string[]> {
        const folder = this.app.vault.getAbstractFileByPath(this.routineFolder);
        if (!folder || !(folder instanceof TFolder)) return [];

        const files = folder.children.filter(f => f instanceof TFile && f.extension === "md");
        // Return names with leading slash, e.g. "/Summarize"
        return files.map((f: TFile) => "/" + f.basename);
    }

    async getRoutineContent(name: string): Promise<string | null> {
        // name includes the leading slash, e.g. "/Summarize"
        const basename = name.substring(1);
        const path = `${this.routineFolder}/${basename}.md`;
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            return await this.app.vault.read(file);
        }
        return null;
    }

    async createRoutine(name: string, content: string): Promise<void> {
        // Ensure folder exists
        if (!this.app.vault.getAbstractFileByPath(this.routineFolder)) {
            await this.app.vault.createFolder(this.routineFolder);
        }

        const path = `${this.routineFolder}/${name}.md`;
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            await this.app.vault.modify(file, content);
        } else {
            await this.app.vault.create(path, content);
        }
    }

    async deleteRoutine(name: string): Promise<boolean> {
        const path = `${this.routineFolder}/${name}.md`;
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            await this.app.vault.delete(file);
            return true;
        }
        return false;
    }
}
