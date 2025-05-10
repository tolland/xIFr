// src/models/types.ts

export interface SDModelInfo {
    model_name: string;
    model_hash: string;
    model_type: SDModelType;
    config?: SDModelConfig;
    metadata?: SDModelMetadata;
}

export enum SDModelType {
    Checkpoint = 'checkpoint',
    Lora = 'lora',
    LyCORIS = 'lycoris',
    TextualInversion = 'textual_inversion',
    VAE = 'vae',
    Hypernetwork = 'hypernetwork',
}

export interface SDModelConfig {
    pretrained_model_name_or_path?: string;
    model_version?: string;
    prediction_type?: string;
    v_prediction?: boolean;
    upcast_attention?: boolean;
    requires_safety_checker?: boolean;
}

export interface SDModelMetadata {
    fps?: number;
    size?: number;
    bsd_tags?: string[];
    civitai_nsfw?: boolean;
    trigger_words?: string[];
    merged_from?: string[];
    base_model?: string;
    training_steps?: number;
    training_epochs?: number;
    trained_words?: string[];
    clip_skip?: number;
    resolution?: number;
}
