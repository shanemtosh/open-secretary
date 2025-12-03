/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { Tool } from "./Tool";
import { Agent } from "../agent/Agent";

export class UpdatePlanTool implements Tool {
    name = "update_plan";
    description = "Update the current plan or todo list. Use this to keep track of your progress on complex tasks. The content should be a markdown list.";
    private agent: Agent;

    constructor(agent: Agent) {
        this.agent = agent;
    }

    async execute(args: { content: string }): Promise<string> {
        if (!args.content) {
            return "Error: Content is required.";
        }
        this.agent.setPlan(args.content);
        return "Plan updated successfully.";
    }

    getSchema() {
        return {
            type: "object",
            properties: {
                content: {
                    type: "string",
                    description: "The plan content as a markdown list."
                }
            },
            required: ["content"]
        };
    }
}
