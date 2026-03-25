/**
 * Copyright (c) 2025 Mimir LLC
 *
 * This file is part of OpenSecretary.
 * Licensed under MIT - see LICENSE file for details.
 */

export interface Tool {
    name: string;
    description: string;
    execute(args: any): Promise<any>;
    getSchema(): any;
}
