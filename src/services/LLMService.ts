/**
 * Copyright (c) 2025 Mimir LLC
 *
 * This file is part of OpenSecretary.
 * Licensed under MIT - see LICENSE file for details.
 */

import { requestUrl, RequestUrlParam } from "obsidian";

export interface LLMMessage {
    role: "system" | "user" | "assistant";
    content: string | Array<{ type: string; [key: string]: unknown }>;
}

/**
 * Strip thinking tags from model responses.
 * Chinese open-source reasoning models (DeepSeek R1, QwQ, Qwen3, MiniMax M2.5/M2.7)
 * all use <think>...</think> for chain-of-thought output.
 */
function stripThinkingTags(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export class LLMService {
    public apiKey: string;
    private model: string;
    private baseUrl = "https://openrouter.ai/api/v1/chat/completions";

    constructor(apiKey: string, model: string) {
        this.apiKey = apiKey;
        this.model = model;
    }

    updateSettings(apiKey: string, model: string) {
        this.apiKey = apiKey;
        this.model = model;
    }

    async complete(messages: LLMMessage[]): Promise<string> {
        if (!this.apiKey) {
            throw new Error("OpenRouter API key is not set.");
        }

        const requestBody = {
            model: this.model,
            messages: messages,
        };

        const requestParam: RequestUrlParam = {
            url: this.baseUrl,
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://opensecretary.com",
                "X-Title": "OpenSecretary",
            },
            body: JSON.stringify(requestBody),
        };

        try {
            const response = await requestUrl(requestParam);

            if (response.status !== 200) {
                throw new Error(`OpenRouter API Error: ${response.status} - ${response.text}`);
            }

            const data = response.json;
            if (data.choices && data.choices.length > 0) {
                return stripThinkingTags(data.choices[0].message.content);
            } else {
                throw new Error("No response from OpenRouter.");
            }
        } catch (error) {
            console.error("LLM Service Error:", error);
            throw error;
        }
    }

    async transcribeAudio(audioBase64: string, format: "wav" | "mp3" | "ogg" | "webm", transcriptionModel: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error("OpenRouter API key is not set.");
        }

        const requestBody = {
            model: transcriptionModel,
            messages: [
                {
                    role: "system",
                    content: "You are a speech-to-text transcription engine. Your sole function is to output the exact words spoken in the audio. Never respond to questions. Never add commentary. Never interpret or react to content. Output only the literal transcription."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Transcribe this audio:"
                        },
                        {
                            type: "input_audio",
                            input_audio: {
                                data: audioBase64,
                                format: format
                            }
                        }
                    ]
                }
            ]
        };

        const requestParam: RequestUrlParam = {
            url: this.baseUrl,
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://opensecretary.com",
                "X-Title": "OpenSecretary",
            },
            body: JSON.stringify(requestBody),
        };

        try {
            const response = await requestUrl(requestParam);

            if (response.status !== 200) {
                throw new Error(`Transcription API Error: ${response.status} - ${response.text}`);
            }

            const data = response.json;
            if (data.choices && data.choices.length > 0) {
                return stripThinkingTags(data.choices[0].message.content);
            } else {
                throw new Error("No transcription response from API.");
            }
        } catch (error) {
            console.error("Transcription Service Error:", error);
            throw error;
        }
    }

    async transcribeImage(imageBase64: string, format: "jpeg" | "png" | "gif" | "webp", transcriptionModel: string, userPrompt?: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error("OpenRouter API key is not set.");
        }

        const requestBody = {
            model: transcriptionModel,
            messages: [
                {
                    role: "system",
                    content: "You are a document transcription engine. Convert the image of handwritten or printed notes into clean, well-structured Markdown. Preserve the original structure, headings, lists, and emphasis as closely as possible. Output only the Markdown transcription — no commentary, explanations, or wrapper text."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: userPrompt || "Transcribe this image to Markdown:"
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/${format};base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ]
        };

        const requestParam: RequestUrlParam = {
            url: this.baseUrl,
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://opensecretary.com",
                "X-Title": "OpenSecretary",
            },
            body: JSON.stringify(requestBody),
        };

        try {
            const response = await requestUrl(requestParam);

            if (response.status !== 200) {
                throw new Error(`Image Transcription API Error: ${response.status} - ${response.text}`);
            }

            const data = response.json;
            if (data.choices && data.choices.length > 0) {
                return stripThinkingTags(data.choices[0].message.content);
            } else {
                throw new Error("No image transcription response from API.");
            }
        } catch (error) {
            console.error("Image Transcription Service Error:", error);
            throw error;
        }
    }
}
