/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { Tool } from "./Tool";
import { Agent } from "../agent/Agent";

export class SubAgentTool implements Tool {
    name = "delegate_task";
    description = "Delegate a complex task to a specialized subagent. Returns the subagent's output. Usage: { \"subAgentName\": \"ExploreAgent\", \"task\": \"Explore the vault...\" }";

    private agent: Agent;

    constructor(agent: Agent) {
        this.agent = agent;
    }

    async execute(args: any): Promise<string> {
        const { subAgentName, task } = args;

        if (!subAgentName || !task) {
            return "Error: Missing subAgentName or task.";
        }

        const subAgent = this.agent.getSubAgent(subAgentName);
        if (!subAgent) {
            const available = this.agent.getAvailableSubAgents().join(", ");
            return `Error: Subagent '${subAgentName}' not found. Available subagents: ${available}`;
        }

        try {
            return await subAgent.run(task);
        } catch (error) {
            return `Error running subagent '${subAgentName}': ${error.message}`;
        }
    }

    getSchema(): any {
        return {
            type: "object",
            properties: {
                subAgentName: {
                    type: "string",
                    description: "The name of the subagent to delegate to (e.g., 'ExploreAgent')."
                },
                task: {
                    type: "string",
                    description: "The task description for the subagent."
                }
            },
            required: ["subAgentName", "task"]
        };
    }
}
