/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

import { requestUrl, RequestUrlParam } from "obsidian";

export interface LLMMessage {
    role: "system" | "user" | "assistant";
    content: string;
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
                return data.choices[0].message.content;
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
                return data.choices[0].message.content.trim();
            } else {
                throw new Error("No transcription response from API.");
            }
        } catch (error) {
            console.error("Transcription Service Error:", error);
            throw error;
        }
    }
}
