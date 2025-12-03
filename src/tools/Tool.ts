/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */

export interface Tool {
    name: string;
    description: string;
    execute(args: any): Promise<any>;
    getSchema(): any;
}
