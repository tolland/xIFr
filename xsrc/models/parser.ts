// src/models/parser.ts

import { SDModelInfo, SDModelType } from './types';

export class SDModelParser {
    static parseFromMetadata(metadata: any): SDModelInfo {
        // Implementation of parsing logic here
        // This would convert raw metadata into your strongly typed model
        return {
            model_name: metadata.model_name || '',
            model_hash: metadata.model_hash || '',
            model_type: metadata.model_type || SDModelType.Checkpoint,
            metadata: {
                fps: metadata.fps,
                size: metadata.size,
                bsd_tags: metadata.bsd_tags || [],
                civitai_nsfw: metadata.civitai_nsfw || false,
                trigger_words: metadata.trigger_words || [],
                merged_from: metadata.merged_from || [],
                base_model: metadata.base_model,
                training_steps: metadata.training_steps,
                training_epochs: metadata.training_epochs,
                trained_words: metadata.trained_words || [],
                clip_skip: metadata.clip_skip,
                resolution: metadata.resolution,
            },
        };
    }
}
