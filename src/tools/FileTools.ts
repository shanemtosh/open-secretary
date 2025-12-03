/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { App, TFile, TFolder, normalizePath } from "obsidian";
import { Tool } from "./Tool";

export class ReadFileTool implements Tool {
    name = "read_file";
    description = "Reads the content of a file. Args: { path: string }";
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async execute(args: { path: string }): Promise<string> {
        const file = this.app.vault.getAbstractFileByPath(normalizePath(args.path));
        if (file instanceof TFile) {
            return await this.app.vault.read(file);
        }
        throw new Error(`File not found: ${args.path}`);
    }

    getSchema() {
        return {
            type: "object",
            properties: {
                path: { type: "string" }
            },
            required: ["path"]
        };
    }
}

export class WriteFileTool implements Tool {
    name = "write_file";
    description = "Creates or overwrites a file. Args: { path: string, content: string }";
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async execute(args: { path: string, content: string }): Promise<string> {
        const path = normalizePath(args.path);
        let file = this.app.vault.getAbstractFileByPath(path);

        if (file instanceof TFile) {
            await this.app.vault.modify(file, args.content);
            return `Updated file: ${path}`;
        } else if (file === null) {
            // Ensure directory exists
            const folderPath = path.substring(0, path.lastIndexOf("/"));
            if (folderPath && !this.app.vault.getAbstractFileByPath(folderPath)) {
                await this.app.vault.createFolder(folderPath);
            }
            await this.app.vault.create(path, args.content);
            return `Created file: ${path}`;
        }
        throw new Error(`Path exists but is not a file: ${path}`);
    }

    getSchema() {
        return {
            type: "object",
            properties: {
                path: { type: "string" },
                content: { type: "string" }
            },
            required: ["path", "content"]
        };
    }
}

export class DeleteFileTool implements Tool {
    name = "delete_file";
    description = "Deletes a file or directory. Args: { path: string }";
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async execute(args: { path: string }): Promise<string> {
        const file = this.app.vault.getAbstractFileByPath(normalizePath(args.path));
        if (file) {
            await this.app.vault.delete(file);
            return `Deleted: ${args.path}`;
        }
        throw new Error(`File not found: ${args.path}`);
    }

    getSchema() {
        return {
            type: "object",
            properties: {
                path: { type: "string" }
            },
            required: ["path"]
        };
    }
}

export class MoveFileTool implements Tool {
    name = "move_file";
    description = "Moves or renames a file. Args: { oldPath: string, newPath: string }";
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async execute(args: { oldPath: string, newPath: string }): Promise<string> {
        const file = this.app.vault.getAbstractFileByPath(normalizePath(args.oldPath));
        if (file) {
            await this.app.vault.rename(file, normalizePath(args.newPath));
            return `Moved ${args.oldPath} to ${args.newPath}`;
        }
        throw new Error(`File not found: ${args.oldPath}`);
    }

    getSchema() {
        return {
            type: "object",
            properties: {
                oldPath: { type: "string" },
                newPath: { type: "string" }
            },
            required: ["oldPath", "newPath"]
        };
    }
}

export class ListDirTool implements Tool {
    name = "list_dir";
    description = "Lists contents of a directory. Args: { path: string }";
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async execute(args: { path: string }): Promise<string[]> {
        const folder = this.app.vault.getAbstractFileByPath(normalizePath(args.path));
        if (folder instanceof TFolder) {
            return folder.children.map(c => c.path);
        }
        throw new Error(`Folder not found: ${args.path}`);
    }

    getSchema() {
        return {
            type: "object",
            properties: {
                path: { type: "string" }
            },
            required: ["path"]
        };
    }
}

export class CreateDirTool implements Tool {
    name = "create_dir";
    description = "Creates a directory. Args: { path: string }";
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async execute(args: { path: string }): Promise<string> {
        await this.app.vault.createFolder(normalizePath(args.path));
        return `Created folder: ${args.path}`;
    }

    getSchema() {
        return {
            type: "object",
            properties: {
                path: { type: "string" }
            },
            required: ["path"]
        };
    }
}

export class EditFileTool implements Tool {
    name = "edit_file";
    description = "Replaces text in a file. Args: { path: string, target: string, replacement: string }";
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async execute(args: { path: string, target: string, replacement: string }): Promise<string> {
        const file = this.app.vault.getAbstractFileByPath(normalizePath(args.path));
        if (file instanceof TFile) {
            const content = await this.app.vault.read(file);
            if (content.includes(args.target)) {
                const newContent = content.replace(args.target, args.replacement);
                await this.app.vault.modify(file, newContent);
                return `Edited file: ${args.path}`;
            }
            throw new Error(`Target text not found in file: ${args.path}`);
        }
        throw new Error(`File not found: ${args.path}`);
    }

    getSchema() {
        return {
            type: "object",
            properties: {
                path: { type: "string" },
                target: { type: "string" },
                replacement: { type: "string" }
            },
            required: ["path", "target", "replacement"]
        };
    }
}

export class AppendFileTool implements Tool {
    name = "append_file";
    description = "Appends text to the end of a file. Args: { path: string, content: string }";
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async execute(args: { path: string, content: string }): Promise<string> {
        const file = this.app.vault.getAbstractFileByPath(normalizePath(args.path));
        if (file instanceof TFile) {
            await this.app.vault.append(file, "\n" + args.content);
            return `Appended to file: ${args.path}`;
        }
        throw new Error(`File not found: ${args.path}`);
    }

    getSchema() {
        return {
            type: "object",
            properties: {
                path: { type: "string" },
                content: { type: "string" }
            },
            required: ["path", "content"]
        };
    }
}
