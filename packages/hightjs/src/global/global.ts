/*
 * This file is part of the HightJS Project.
 * Copyright (c) 2025 itsmuzin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Type declarations for asset imports
 * This allows TypeScript to understand imports of various file types
 */

// Markdown files
declare module "*.md" {
    const content: string;
    export default content;
}

// Images
declare module "*.png" {
    const src: string;
    export default src;
}

declare module "*.jpg" {
    const src: string;
    export default src;
}

declare module "*.jpeg" {
    const src: string;
    export default src;
}

declare module "*.gif" {
    const src: string;
    export default src;
}

declare module "*.webp" {
    const src: string;
    export default src;
}

declare module "*.avif" {
    const src: string;
    export default src;
}

declare module "*.ico" {
    const src: string;
    export default src;
}

declare module "*.bmp" {
    const src: string;
    export default src;
}

declare module "*.tif" {
    const src: string;
    export default src;
}

declare module "*.tiff" {
    const src: string;
    export default src;
}

// SVG (with additional export for raw content)
declare module "*.svg" {
    const src: string;
    export const svgContent: string;
    export default src;
}

// JSON files
declare module "*.json" {
    const value: any;
    export default value;
}

// Text files
declare module "*.txt" {
    const content: string;
    export default content;
}

// Fonts
declare module "*.woff" {
    const src: string;
    export default src;
}

declare module "*.woff2" {
    const src: string;
    export default src;
}

declare module "*.ttf" {
    const src: string;
    export default src;
}

declare module "*.otf" {
    const src: string;
    export default src;
}

declare module "*.eot" {
    const src: string;
    export default src;
}

// Audio files
declare module "*.mp3" {
    const src: string;
    export default src;
}

declare module "*.wav" {
    const src: string;
    export default src;
}

declare module "*.ogg" {
    const src: string;
    export default src;
}

declare module "*.m4a" {
    const src: string;
    export default src;
}

declare module "*.aac" {
    const src: string;
    export default src;
}

declare module "*.flac" {
    const src: string;
    export default src;
}

// Video files
declare module "*.mp4" {
    const src: string;
    export default src;
}

declare module "*.webm" {
    const src: string;
    export default src;
}

declare module "*.ogv" {
    const src: string;
    export default src;
}

