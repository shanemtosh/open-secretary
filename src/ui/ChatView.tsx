/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import {
    App,
    ItemView,
    WorkspaceLeaf,
    MarkdownRenderer,
    Notice,
    TFile,
    setIcon,
    Menu,
    Component,
    Platform
} from "obsidian";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot, Root } from "react-dom/client";
import { Agent, AgentMode } from "../agent/Agent";
import {
    IconSend,
    IconPaperclip,
    IconCode,
    IconHistory,
    IconDeviceLaptop,
    IconBolt,
    IconCircle,
    IconCircleDashed,
    IconProgress,
    IconPlus,
    IconRobot,
    IconChevronDown,
    IconArrowUp,
    IconAdjustments
} from "@tabler/icons-react";

export const VIEW_TYPE_CHAT = "agent-chat-view";

// Helper component for Session List
const SessionList = ({ sessions, onSelect }: { sessions: string[], onSelect: (path: string) => void }) => {
    return (
        <div className="agent-session-list">
            <div className="agent-session-header">Saved Sessions</div>
            {sessions.map((path, i) => (
                <div key={i} className="agent-session-item" onClick={() => onSelect(path)}>
                    <IconHistory size={14} style={{ marginRight: "6px" }} />
                    <span className="agent-session-name">{path.split("/").pop()}</span>
                </div>
            ))}
        </div>
    );
};

// Helper component for Diff View
const DiffViewer = ({ args, toolName }: { args: any, toolName: string }) => {
    if (toolName === "replace_file_content") {
        return (
            <div className="diff-container">
                <div className="diff-chunk">
                    <div className="diff-header">{args.TargetFile} (Lines {args.StartLine}-{args.EndLine})</div>
                    <div className="diff-content">
                        <div className="diff-remove">{args.TargetContent}</div>
                        <div className="diff-add">{args.ReplacementContent}</div>
                    </div>
                </div>
            </div>
        );
    }
    if (toolName === "multi_replace_file_content") {
        return (
            <div className="diff-container">
                <div className="diff-header">{args.TargetFile}</div>
                {args.ReplacementChunks.map((chunk: any, i: number) => (
                    <div key={i} className="diff-chunk">
                        <div className="diff-header">Chunk {i + 1} (Lines {chunk.StartLine}-{chunk.EndLine})</div>
                        <div className="diff-content">
                            <div className="diff-remove">{chunk.TargetContent}</div>
                            <div className="diff-add">{chunk.ReplacementContent}</div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    // Default JSON view for other tools
    return (
        <pre className="agent-approval-content">
            {JSON.stringify(args, null, 2)}
        </pre>
    );
};

export class ChatView extends ItemView {
    agent: Agent;
    private root: Root | null = null;

    constructor(leaf: WorkspaceLeaf, agent: Agent) {
        super(leaf);
        this.agent = agent;
    }

    getViewType() {
        return VIEW_TYPE_CHAT;
    }

    getDisplayText() {
        return "Agent Chat";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        ReactDOM.render(
            <ChatComponent agent={this.agent} view={this} />,
            container
        );
    }

    async onClose() {
        ReactDOM.unmountComponentAtNode(this.containerEl.children[1]);
    }
}

const MarkdownMessage = ({ content, app, component }: { content: string, app: any, component: Component }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (containerRef.current) {
            containerRef.current.empty();
            MarkdownRenderer.render(app, content, containerRef.current, "", component);
        }
    }, [content, app, component]);

    return <div ref={containerRef} />;
};

const ChatComponent = ({ agent, view }: { agent: Agent, view: ChatView }) => {
    // Extended message type to store tool details and custom UI types
    const [messages, setMessages] = React.useState<{ role: string, content: string, type?: "text" | "tool" | "history_list", toolName?: string, toolArgs?: any, sessions?: string[] }[]>([]);
    const [input, setInput] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [plan, setPlan] = React.useState("");
    const [showPlan, setShowPlan] = React.useState(false);
    const [mode, setMode] = React.useState<AgentMode>("high");
    const [approvalRequest, setApprovalRequest] = React.useState<{ tool: string, args: any, resolve: (value: boolean) => void } | null>(null);

    // UI State
    const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);
    const [currentModel, setCurrentModel] = React.useState(agent.modelName);
    const [verboseToolOutput, setVerboseToolOutput] = React.useState(false); // Toggle state

    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const messagesContainerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLTextAreaElement>(null);
    const inputWrapperRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Suggestions state
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [suggestions, setSuggestions] = React.useState<any[]>([]);
    const [suggestionIndex, setSuggestionIndex] = React.useState(0);
    const [suggestionType, setSuggestionType] = React.useState<"file" | "command" | "subcommand" | "inline">("file");

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    React.useEffect(() => {
        scrollToBottom();
        if (messages.length > 0) {
            agent.saveSession();
        }
    }, [messages, loading]);

    React.useEffect(() => {
        const updatePadding = () => {
            if (inputWrapperRef.current && messagesContainerRef.current) {
                const wrapperHeight = inputWrapperRef.current.offsetHeight;
                messagesContainerRef.current.style.paddingBottom = `${wrapperHeight + 32}px`;
            }
        };

        updatePadding();
        const resizeObserver = new ResizeObserver(updatePadding);
        if (inputWrapperRef.current) {
            resizeObserver.observe(inputWrapperRef.current);
        }
        return () => resizeObserver.disconnect();
    }, [plan, showPlan, showSuggestions, approvalRequest]);

    // Close dropdowns when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    React.useEffect(() => {
        agent.onMessage = (content) => {
            // We handle message updates via the chat loop
        };
        agent.onToolStart = (tool, args) => {
            // Store structured tool data
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `Using ${tool}...`, // Fallback content
                type: "tool",
                toolName: tool,
                toolArgs: args
            }]);
        };
        agent.onToolFinish = (tool, result) => {
            // Optional
        };
        agent.onPlanUpdate = (newPlan) => {
            setPlan(newPlan);
            // Don't force open: setShowPlan(true);
        };
        agent.onModeChange = (newMode) => {
            setMode(newMode);
        };
        agent.onApprovalRequest = async (tool, args) => {
            return new Promise<boolean>((resolve) => {
                setApprovalRequest({ tool, args, resolve });
            });
        };

        // Initial state
        setMode(agent.mode);
        setPlan(agent.plan);
        setMessages(agent.history.map(msg => ({ role: msg.role, content: msg.content })));
        setCurrentModel(agent.modelName);
    }, [agent]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (approvalRequest) {
                if (e.key === 'y' || e.key === 'Y') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleApproval(true);
                    return;
                }
                if (e.key === 'n' || e.key === 'N') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleApproval(false);
                    return;
                }
            }

            if (e.altKey && e.code === 'KeyV') {
                e.preventDefault();
                setVerboseToolOutput(prev => !prev);
                new Notice(verboseToolOutput ? "Tool output: Compact" : "Tool output: Verbose");
            } else if (e.shiftKey && e.key === "Tab") {
                e.preventDefault();
                cycleMode();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [agent, mode, verboseToolOutput, approvalRequest]);

    const cycleMode = () => {
        const modes: AgentMode[] = ["high", "plan", "low"];
        const currentIndex = modes.indexOf(agent.mode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        agent.setMode(nextMode);
        new Notice(`Switched to ${nextMode.toUpperCase()} mode`);
    };

    const handleInputChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInput(value);

        // Auto-resize
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = inputRef.current.scrollHeight + "px";
        }

        // Suggestions Logic
        const cursor = e.target.selectionStart;
        const lastAt = value.lastIndexOf("@", cursor);
        const lastSlash = value.lastIndexOf("/", cursor);

        // Sub-command suggestions for /subagent
        if (value.trim().startsWith("/subagent")) {
            const parts = value.split(" ");
            if (parts.length === 2) {
                const query = parts[1].toLowerCase();
                setSuggestionType("subcommand");
                const subAgents = agent.getAvailableSubAgents();
                const matches = subAgents.filter(s => s.toLowerCase().startsWith(query));
                setSuggestions(matches);
                setShowSuggestions(matches.length > 0);
                setSuggestionIndex(0);
                return;
            }
        }

        // Sub-command suggestions for /routine
        if (value.trim().startsWith("/routine")) {
            const parts = value.split(" ");
            if (parts.length === 2) {
                const query = parts[1].toLowerCase();
                setSuggestionType("subcommand");
                const subCommands = ["add", "manage", "delete"];
                const routines = await agent.listRoutines();
                const routineNames = routines.map(r => r.replace("/", ""));
                const options = [...subCommands, ...routineNames];

                const matches = options.filter(o => o.toLowerCase().startsWith(query));
                setSuggestions(matches);
                setShowSuggestions(matches.length > 0);
                setSuggestionIndex(0);
                return;
            }
        }

        // Sub-command suggestions for /output
        if (value.trim().startsWith("/output")) {
            const parts = value.split(" ");
            if (parts.length === 2) {
                const query = parts[1].toLowerCase();
                setSuggestionType("subcommand");
                const options = ["compact", "verbose"];
                const matches = options.filter(o => o.toLowerCase().startsWith(query));
                setSuggestions(matches);
                setShowSuggestions(matches.length > 0);
                setSuggestionIndex(0);
                return;
            }
        }

        // Sub-command suggestions for /load
        if (value.trim().startsWith("/load")) {
            const parts = value.split(" ");
            if (parts.length === 2) {
                const query = parts[1].toLowerCase();
                setSuggestionType("subcommand");
                const sessions = await agent.listSessions();
                const matches = sessions.filter(s => s.toLowerCase().includes(query));
                setSuggestions(matches);
                setShowSuggestions(matches.length > 0);
                setSuggestionIndex(0);
                return;
            }
        }

        // File suggestions (@)
        if (lastAt !== -1 && lastAt < cursor && !value.substring(lastAt, cursor).includes(" ")) {
            const query = value.substring(lastAt + 1, cursor);
            setSuggestionType("file");
            const files = await agent.searchFiles(query);
            setSuggestions(files);
            setShowSuggestions(files.length > 0);
        }
        // Command suggestions (/)
        else if (lastSlash !== -1 && lastSlash < cursor && !value.substring(lastSlash, cursor).includes(" ")) {
            const query = value.substring(lastSlash + 1, cursor);
            setSuggestionType("command");

            const commandDefinitions = [
                { command: "/help", description: "Show help & hotkeys", aliases: ["/h", "/?"] },
                { command: "/new", description: "Clear chat & start fresh", aliases: ["/clear", "/reset", "/n"] },
                { command: "/history", description: "List saved sessions", aliases: ["/saved", "/h"] },
                { command: "/init", description: "Run initialization routine", aliases: [] },
                { command: "/stop", description: "Stop current execution", aliases: ["/cancel", "/s"] },
                { command: "/output", description: "Set tool output verbosity", aliases: ["/o"] },
                { command: "/load", description: "Load a saved session", aliases: ["/l"] },
                { command: "/routine", description: "Run a saved routine", aliases: ["/r"] },
                { command: "/subagent", description: "Invoke a subagent", aliases: ["/agent"] },
                { command: "/memory", description: "Access memory store", aliases: ["/mem"] },
                { command: "/compact", description: "Summarize & compact history", aliases: [] }
            ];

            const routines = await agent.listRoutines();
            const routineCommands = routines.map(r => ({
                command: r,
                description: "Run routine",
                aliases: [] as string[]
            }));

            const allCommands = [...commandDefinitions, ...routineCommands];

            const matches = allCommands.filter(def =>
                def.command.toLowerCase().startsWith("/" + query.toLowerCase()) ||
                def.aliases.some(a => a.toLowerCase().startsWith("/" + query.toLowerCase()))
            ).map(def => ({
                display: def.command,
                description: def.description,
                insert: def.command
            }));

            setSuggestions(matches);
            setShowSuggestions(matches.length > 0);
            setSuggestionIndex(0);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleCancel = () => {
        agent.stop();
        setLoading(false);
        setMessages(prev => [...prev, { role: "assistant", content: "Action cancelled by user." }]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showSuggestions) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSuggestionIndex(prev => (prev + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertSuggestion(suggestions[suggestionIndex]);
            } else if (e.key === "Escape") {
                setShowSuggestions(false);
            }
            return;
        }

        // Cancel on Cmd/Ctrl + Esc
        if ((e.metaKey || e.ctrlKey) && e.key === "Escape") {
            e.preventDefault();
            handleCancel();
            return;
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const insertSuggestion = (suggestion: any) => {
        const text = typeof suggestion === 'string' ? suggestion : suggestion.insert;
        const cursor = inputRef.current?.selectionStart || 0;

        if (suggestionType === "subcommand") {
            const lastSpace = input.lastIndexOf(" ", cursor - 1);
            const newValue = input.substring(0, lastSpace + 1) + text + " " + input.substring(cursor);
            setInput(newValue);
        } else if (suggestionType === "inline") {
            // Simple replacement for inline suggestions (e.g., from a specific tool)
            const newValue = input.substring(0, input.lastIndexOf("/")) + text;
            setInput(newValue);
        } else { // This handles "file" and "command"
            const triggerChar = suggestionType === "file" ? "@" : "/";
            const lastTrigger = input.lastIndexOf(triggerChar, cursor);

            // Commands that execute immediately without arguments
            const immediateCommands = ["/new", "/help", "/history", "/init", "/stop", "/compact"];
            const shouldAddSpace = !immediateCommands.includes(text);

            const newValue = input.substring(0, lastTrigger) + text + (shouldAddSpace ? " " : "") + input.substring(cursor);
            setInput(newValue);
        }

        setShowSuggestions(false);
        if (inputRef.current) inputRef.current.focus();
    };

    const handleSubmit = async () => {
        const isStopCommand = input.trim().startsWith("/stop") || input.trim().startsWith("/cancel");
        if ((!input.trim() || loading) && !isStopCommand) return;

        const userMsg = input;

        // Handle Slash Commands
        if (userMsg.startsWith("/")) {
            const command = userMsg.split(" ")[0];

            if (command === "/stop" || command === "/cancel") {
                agent.stop(); // Ensure we actually stop the agent
                setLoading(false);
                setInput("");
                setMessages(prev => [...prev, { role: "assistant", content: "<span style='color: var(--destructive);'>Action cancelled by user.</span>" }]);
                return;
            }

            if (command === "/help") {
                const helpContent = `## Hotkeys

- **Shift+Tab**: Cycle mode (High → Plan → Low)
- **Alt/Option+V**: Toggle verbose tool output
- **Shift+Enter**: New line in input
- **Cmd/Ctrl+Esc**: Cancel running agent

## Slash Commands

- **/help** - Show this help message
- **/new** - Start a new conversation
- **/history** - List saved sessions
- **/init** - Run initialization routine
- **/stop** - Stop the current agent execution
- **/output [verbose|compact]** - Set tool output verbosity
- **/load [path]** - Load a saved session
- **/routine [name]** - Run a saved routine
- **/subagent [name]** - Invoke a subagent
- **/memory [key]** - Access memory store
- **/compact [instructions]** - Summarize conversation & clear history

## File References

- Type **@** to search and reference files in your vault`;

                setMessages(prev => [...prev, { role: "assistant", content: helpContent }]);
                setInput("");
                if (inputRef.current) inputRef.current.style.height = "auto";
                return;
            }

            if (command === "/new") {
                await agent.clearHistory();
                setMessages([]);
                setPlan("");
                setInput("");
                if (inputRef.current) inputRef.current.style.height = "auto";
                return;
            }

            if (command === "/output") {
                const parts = userMsg.trim().split(" ");
                const mode = parts[1];

                if (mode === "verbose") {
                    setVerboseToolOutput(true);
                    setMessages(prev => [...prev, { role: "assistant", content: "Tool output set to **verbose**." }]);
                } else if (mode === "compact") {
                    setVerboseToolOutput(false);
                    setMessages(prev => [...prev, { role: "assistant", content: "Tool output set to **compact**." }]);
                } else {
                    setMessages(prev => [...prev, { role: "assistant", content: "Usage: `/output verbose` or `/output compact`" }]);
                }

                setInput("");
                if (inputRef.current) inputRef.current.style.height = "auto";
                return;
            }



            if (command === "/history") {
                setLoading(true);
                setMessages(prev => [...prev, { role: "user", content: "/history" }]);
                setInput("");
                if (inputRef.current) inputRef.current.style.height = "auto";

                try {
                    const sessions = await agent.listSessions();
                    if (sessions.length === 0) {
                        setMessages(prev => [...prev, { role: "assistant", content: "No saved sessions found." }]);
                    } else {
                        setMessages(prev => [...prev, { role: "assistant", content: "Select a session to load:", type: "history_list", sessions: sessions }]);
                    }
                } catch (error) {
                    setMessages(prev => [...prev, { role: "assistant", content: "Error listing sessions: " + error.message }]);
                } finally {
                    setLoading(false);
                }
                return;
            }

            if (command === "/init") {
                setLoading(true);
                setMessages(prev => [...prev, { role: "user", content: "/init" }]);
                setInput("");
                if (inputRef.current) inputRef.current.style.height = "auto";

                try {
                    const response = await agent.runInitRoutine();
                    setMessages(prev => [...prev, { role: "assistant", content: response }]);
                } catch (error) {
                    setMessages(prev => [...prev, { role: "assistant", content: "Error running init routine: " + error.message }]);
                } finally {
                    setLoading(false);
                }
                return;
            }

            if (command === "/load") {
                const path = userMsg.substring(6).trim();
                if (!path) {
                    setMessages(prev => [...prev, { role: "assistant", content: "Please specify a session path to load." }]);
                    return;
                }

                setLoading(true);
                setMessages(prev => [...prev, { role: "user", content: userMsg }]);
                setInput("");
                if (inputRef.current) inputRef.current.style.height = "auto";

                try {
                    await agent.loadSession(path);
                    setMessages(agent.history.map(msg => ({ role: msg.role, content: msg.content })));
                    setMessages(prev => [...prev, { role: "assistant", content: `Session loaded from ${path}` }]);
                } catch (error) {
                    setMessages(prev => [...prev, { role: "assistant", content: "Error loading session: " + error.message }]);
                } finally {
                    setLoading(false);
                }
                return;
            }

            if (command === "/memory") {
                const content = userMsg.substring(8).trim();
                if (!content) {
                    setMessages(prev => [...prev, { role: "assistant", content: "Please specify what you want me to remember." }]);
                    return;
                }

                setLoading(true);
                setMessages(prev => [...prev, { role: "user", content: userMsg }]);
                setInput("");
                if (inputRef.current) inputRef.current.style.height = "auto";

                try {
                    // Use concatenation to avoid nested backtick issues
                    const systemMsg = "[SYSTEM: The user explicitly requested to save the following to memory: \"" + content + "\"]";
                    const response = await agent.chat(systemMsg);
                    setMessages(prev => [...prev, { role: "assistant", content: response }]);
                } catch (error) {
                    setMessages(prev => [...prev, { role: "assistant", content: "Error processing memory request: " + error.message }]);
                } finally {
                    setLoading(false);
                }
                return;
            }

            if (command === "/routine") {
                const parts = userMsg.trim().split(" ");
                const subCommand = parts[1];

                setMessages(prev => [...prev, { role: "user", content: userMsg }]);
                setInput("");
                if (inputRef.current) inputRef.current.style.height = "auto";

                if (subCommand === "add") {
                    setLoading(true);
                    try {
                        // Avoid nested backticks in example
                        setMessages(prev => [...prev, { role: "assistant", content: "Okay, let's create a new routine. Please tell me the name of the routine, followed by its instructions. For example: 'MyRoutine: This is what MyRoutine does.'" }]);
                    } catch (error) {
                        setMessages(prev => [...prev, { role: "assistant", content: "Error starting routine creation: " + error.message }]);
                    } finally {
                        setLoading(false);
                    }
                    return;
                }

                if (subCommand === "manage") {
                    setLoading(true);
                    try {
                        const routines = await agent.listRoutines();
                        if (routines.length === 0) {
                            setMessages(prev => [...prev, { role: "assistant", content: "No routines found." }]);
                        } else {
                            // Use concatenation to avoid nested backtick issues
                            const list = routines.map(r => "- " + r + " (delete with `/routine delete " + r.substring(1) + "`)").join("\n");
                            setMessages(prev => [...prev, { role: "assistant", content: "Available Routines:\n" + list }]);
                        }
                    } catch (error) {
                        setMessages(prev => [...prev, { role: "assistant", content: "Error listing routines: " + error.message }]);
                    } finally {
                        setLoading(false);
                    }
                    return;
                }

                if (subCommand === "delete") {
                    const name = parts[2];
                    if (!name) {
                        setMessages(prev => [...prev, { role: "assistant", content: "Please specify a routine name to delete." }]);
                        return;
                    }
                    setLoading(true);
                    try {
                        const success = await agent.deleteRoutine("/" + name);
                        if (success) {
                            setMessages(prev => [...prev, { role: "assistant", content: `Routine '${name}' deleted.` }]);
                        } else {
                            setMessages(prev => [...prev, { role: "assistant", content: `Routine '${name}' not found.` }]);
                        }
                    } catch (error) {
                        setMessages(prev => [...prev, { role: "assistant", content: "Error deleting routine: " + error.message }]);
                    } finally {
                        setLoading(false);
                    }
                    return;
                }

                if (subCommand) {
                    const routineName = subCommand.startsWith("/") ? subCommand : "/" + subCommand;
                    const context = parts.slice(2).join(" ");

                    setLoading(true);
                    try {
                        const routines = await agent.listRoutines();
                        if (routines.includes(routineName)) {
                            const response = await agent.chat(`Run routine '${routineName}' with context: ${context}`);
                            setMessages(prev => [...prev, { role: "assistant", content: response }]);
                        } else {
                            setMessages(prev => [...prev, { role: "assistant", content: `Routine '${subCommand}' not found.` }]);
                        }
                    } catch (error) {
                        setMessages(prev => [...prev, { role: "assistant", content: "Error running routine: " + error.message }]);
                    } finally {
                        setLoading(false);
                    }
                    return;
                }

                setMessages(prev => [...prev, { role: "assistant", content: "Usage:\n- `/routine add`: Create a new routine\n- `/routine manage`: List and manage routines\n- `/routine delete <name>`: Delete a routine\n- `/routine <name> [context]`: Run a routine" }]);
                return;
            }

            if (command === "/compact") {
                const instructions = userMsg.substring(8).trim();
                setLoading(true);
                setMessages(prev => [...prev, { role: "user", content: userMsg }]);
                setInput("");
                if (inputRef.current) inputRef.current.style.height = "auto";

                try {
                    let prompt = "Please summarize our conversation so far into a concise format, preserving key information and decisions. Then we will clear the history and keep only this summary.";
                    if (instructions) {
                        prompt += `\n\nFocus specifically on the following instructions for the summary: ${instructions}`;
                    }

                    const summary = await agent.chat(prompt);
                    await agent.clearHistory();
                    agent.history.push({ role: "assistant", content: summary });

                    setMessages([
                        { role: "assistant", content: summary }
                    ]);
                } catch (error) {
                    setMessages(prev => [...prev, { role: "assistant", content: "Error compacting memory: " + error.message }]);
                } finally {
                    setLoading(false);
                }
                return;
            }

            if (command === "/subagent") {
                const parts = userMsg.trim().split(" ");
                const subAgentName = parts[1];
                const task = parts.slice(2).join(" ");

                if (!subAgentName) {
                    const available = agent.getAvailableSubAgents().join(", ");
                    setMessages(prev => [...prev, { role: "assistant", content: `Usage: \`/subagent <name> <task>\`\nAvailable subagents: ${available}` }]);
                    return;
                }

                if (!task) {
                    setMessages(prev => [...prev, { role: "assistant", content: "Please provide a task for the subagent." }]);
                    return;
                }

                setLoading(true);
                setMessages(prev => [...prev, { role: "user", content: userMsg }]);
                setInput("");
                if (inputRef.current) inputRef.current.style.height = "auto";

                try {
                    const subAgent = agent.getSubAgent(subAgentName);
                    if (!subAgent) {
                        const available = agent.getAvailableSubAgents().join(", ");
                        setMessages(prev => [...prev, { role: "assistant", content: `Error: Subagent '${subAgentName}' not found. Available subagents: ${available}` }]);
                    } else {
                        setMessages(prev => [...prev, { role: "assistant", content: `Running subagent '${subAgentName}'...` }]);
                        const response = await subAgent.run(task);
                        setMessages(prev => [...prev, { role: "assistant", content: `**${subAgentName} Output:**\n${response}` }]);
                        agent.history.push({ role: "user", content: `[User ran subagent '${subAgentName}' with task: "${task}"]` });
                        agent.history.push({ role: "assistant", content: `Subagent '${subAgentName}' output: ${response}` });
                    }
                } catch (error) {
                    setMessages(prev => [...prev, { role: "assistant", content: `Error running subagent '${subAgentName}': ${error.message}` }]);
                } finally {
                    setLoading(false);
                }
                return;
            }
        }

        setInput("");
        if (inputRef.current) inputRef.current.style.height = "auto";
        setLoading(true);
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);

        try {
            const response = await agent.chat(userMsg);
            setMessages(prev => [...prev, { role: "assistant", content: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", content: "Error: " + error.message }]);
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = (approved: boolean) => {
        if (approvalRequest) {
            approvalRequest.resolve(approved);
            setApprovalRequest(null);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        insertSuggestion(suggestion);
    };

    const handleModelChange = async (newModel: string) => {
        setCurrentModel(newModel);
        agent.updateSettings(agent.apiKey, newModel, agent.contextFile, agent.historyFolder, agent.researchModel);
        setActiveDropdown(null);
    };

    // Extract current step from plan
    const getCurrentStep = (planText: string) => {
        const lines = planText.split("\n");
        const current = lines.find(l => l.trim().startsWith("- [ ]") || l.trim().startsWith("- [/]"));
        return current ? current.replace(/- \[[ /]\]/, "").trim() : "Plan active...";
    };

    const handleLoadSession = async (path: string) => {
        setLoading(true);
        try {
            await agent.loadSession(path);
            setMessages(agent.history.map(msg => ({ role: msg.role, content: msg.content })));
            setMessages(prev => [...prev, { role: "assistant", content: `Session loaded from ${path}` }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", content: "Error loading session: " + error.message }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`agent-chat-container ${Platform.isMobile ? "mobile" : ""}`}>
            <div className="agent-chat-messages" ref={messagesContainerRef}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`agent-message ${msg.role} ${msg.type === "tool" ? "tool" : ""}`}>
                        <div className="message-content">
                            {msg.type === "tool" ? (
                                verboseToolOutput ? (
                                    <div className="tool-output-verbose">
                                        <div className="tool-output-header">Using {msg.toolName}</div>
                                        {msg.toolName === "run_command" ? (
                                            <div>
                                                <div style={{ color: "var(--text-accent)" }}>$ {msg.toolArgs.CommandLine}</div>
                                            </div>
                                        ) : (
                                            <pre style={{ margin: 0 }}>{JSON.stringify(msg.toolArgs, null, 2)}</pre>
                                        )}
                                    </div>
                                ) : (
                                    `Using ${msg.toolName}...`
                                )
                            ) : msg.type === "history_list" ? (
                                <SessionList sessions={msg.sessions || []} onSelect={handleLoadSession} />
                            ) : (
                                <MarkdownMessage content={msg.content} app={agent.app} component={view} />
                            )}
                        </div>
                    </div>
                ))}

                {/* Inline Approval Component */}
                {approvalRequest && (
                    <div className="agent-approval-inline">
                        <div className="agent-approval-header">
                            <span>Approval Required: {approvalRequest.tool}</span>
                        </div>

                        <DiffViewer args={approvalRequest.args} toolName={approvalRequest.tool} />

                        <div className="agent-approval-actions">
                            <span className="agent-approval-hint">Press 'y' to approve, 'n' to deny</span>
                            <button className="btn-deny" onClick={() => handleApproval(false)}>Deny (n)</button>
                            <button className="btn-approve" onClick={() => handleApproval(true)}>Approve (y)</button>
                        </div>
                    </div>
                )}

                {loading && !approvalRequest && <div className="agent-message assistant"><div className="message-content">Thinking...</div></div>}
                <div ref={messagesEndRef} />
            </div>

            <div className="agent-input-wrapper" ref={(el) => { inputWrapperRef.current = el; (dropdownRef as React.MutableRefObject<HTMLDivElement | null>).current = el; }}>
                {/* Plan Card */}
                {plan && (
                    <div className={`agent-plan-card ${showPlan ? "expanded" : "collapsed"}`}>
                        <div className="agent-plan-header" onClick={() => setShowPlan(!showPlan)}>
                            <div className="agent-plan-title">
                                {showPlan ? "Current Plan" : <span className="agent-plan-summary">{getCurrentStep(plan)}</span>}
                            </div>
                            <div className="agent-plan-toggle">
                                {showPlan ? <IconChevronDown size={14} /> : "..."}
                            </div>
                        </div>
                        {showPlan && (
                            <div className="agent-plan-content">
                                <MarkdownMessage content={plan} app={agent.app} component={view} />
                            </div>
                        )}
                    </div>
                )}

                {/* Suggestions */}
                {showSuggestions && (
                    <div className="agent-suggestions">
                        {suggestions.map((s, i) => (
                            <div key={i}
                                className={`agent-suggestion-item ${i === suggestionIndex ? "is-selected" : ""}`}
                                onClick={() => handleSuggestionClick(s)}
                            >
                                {typeof s === 'string' ? s : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 500 }}>{s.display}</span>
                                        {s.description && <span style={{ opacity: 0.5, fontSize: '0.8em', marginLeft: '10px' }}>{s.description}</span>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}



                {activeDropdown === "model" && (
                    <div className="agent-dropdown-content" style={{ bottom: "100%", left: "0", marginBottom: "0.5rem" }}>
                        {agent.availableModels.map((m, i) => (
                            <div key={i} className="agent-dropdown-item" onClick={() => handleModelChange(m)}>
                                <IconDeviceLaptop size={16} /> {m.split("/").pop()}
                            </div>
                        ))}
                    </div>
                )}

                {activeDropdown === "mode" && (
                    <div className="agent-dropdown-content" style={{ bottom: "100%", left: "0", marginBottom: "0.5rem" }}>
                        <div className="agent-dropdown-item" onClick={() => { agent.setMode("high"); setActiveDropdown(null); }}>
                            <IconCircle size={16} /> High
                        </div>
                        <div className="agent-dropdown-item" onClick={() => { agent.setMode("low"); setActiveDropdown(null); }}>
                            <IconCircleDashed size={16} /> Low
                        </div>
                        <div className="agent-dropdown-item" onClick={() => { agent.setMode("plan"); setActiveDropdown(null); }}>
                            <IconProgress size={16} /> Plan
                        </div>
                    </div>
                )}

                <div className={`agent-ai03-container ${Platform.isMobile ? "mobile" : ""}`}>
                    {Platform.isMobile ? (
                        <div className="agent-mobile-input-row">
                            <textarea
                                ref={inputRef}
                                className="agent-ai03-textarea"
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Message..."
                                rows={1}
                            />
                            <button
                                className="agent-btn-send"
                                onClick={loading ? handleCancel : handleSubmit}
                                disabled={!input.trim() && !loading}
                                style={{ backgroundColor: loading ? "var(--destructive)" : "var(--claude-send-btn)" }}
                            >
                                {loading ? <div style={{ width: "10px", height: "10px", background: "white", borderRadius: "2px" }} /> : <IconArrowUp size={18} />}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="agent-ai03-input-area">
                                <textarea
                                    ref={inputRef}
                                    className="agent-ai03-textarea"
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="How can I help you today?"
                                    rows={1}
                                />
                            </div>

                            <div className="agent-ai03-footer">
                                <div className="agent-ai03-left-actions">
                                    <button className="agent-model-selector" onClick={() => setActiveDropdown(activeDropdown === "model" ? null : "model")}>
                                        <span className="agent-model-name">{currentModel.split("/").pop()}</span>
                                        <IconChevronDown size={14} style={{ opacity: 0.5 }} />
                                    </button>

                                    <button className="agent-model-selector" onClick={() => setActiveDropdown(activeDropdown === "mode" ? null : "mode")}>
                                        <span className="agent-model-name">{mode === "high" ? "High" : (mode === "low" ? "Low" : "Plan")}</span>
                                        <IconChevronDown size={14} style={{ opacity: 0.5 }} />
                                    </button>
                                </div>
                                <div className="agent-ai03-right-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <button
                                        className="agent-btn-send"
                                        onClick={loading ? handleCancel : handleSubmit}
                                        disabled={!input.trim() && !loading}
                                        style={{ backgroundColor: loading ? "var(--destructive)" : "var(--claude-send-btn)" }}
                                    >
                                        {loading ? <div style={{ width: "10px", height: "10px", background: "white", borderRadius: "2px" }} /> : <IconArrowUp size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="agent-ai03-bottom-row">
                                <div>Shift+Tab: Cycle Mode</div>
                                <div>{loading ? "Cmd+Esc: Cancel" : "Shift+Enter: New Line"}</div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
