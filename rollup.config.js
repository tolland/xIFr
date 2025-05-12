// rollup.config.js

// import { chromeExtension } from 'rollup-plugin-chrome-extension'
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';
//import prettier from 'rollup-plugin-prettier';

import { exec } from 'child_process';

function webExtHook() {
    return {
        name: 'web-ext-hook',
        writeBundle() {
            exec(
                'web-ext build --overwrite-dest --source-dir ./dist --artifacts-dir=firefox1',
                (err, stdout, stderr) => {
                    if (err) {
                        console.error('web-ext failed:', err);
                    } else {
                        console.log('web-ext launched Firefox:', stdout);
                    }
                }
            );
        },
    };
}

export default {
    input: {
        manifest: 'WebExtension/manifest.json',
        background: 'WebExtension/background.js',
        content: 'WebExtension/content.js',
        'deepsearch/bg_images': 'WebExtension/deepsearch/bg_images.js',
        'deepsearch/image_search': 'WebExtension/deepsearch/image_search.js',
        context: 'WebExtension/context.js',
        'utils/translate': 'WebExtension/utils/translate.js',
        'content-script': 'WebExtension/content-script.js',
        'popup/popup': 'WebExtension/popup/popup.js',
        'sidebar/choose_file': 'WebExtension/sidebar/choose_file.js',
        'viewer/viewer': 'WebExtension/viewer/viewer.js',
        'options/options': 'WebExtension/options/options.js',
    },
    output: {
        dir: 'dist',
        format: 'esm',
        sourcemap: true,
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        preserveModules: false,
        preserveModulesRoot: 'WebExtension',
    },

    plugins: [
        // chromeExtension(),
        resolve({
            browser: true,
            preferBuiltins: false,
            // This will allow rollup to include node_modules
            moduleDirectories: ['node_modules'],
            extensions: ['.js', '.ts'],
        }),
        commonjs({
            // This helps convert CommonJS modules to ES6
            include: 'node_modules/**',
        }),
        typescript({
            tsconfig: './tsconfig.json',
            sourceMap: true,
        }),
        json(),
        copy({
            targets: [
                { src: 'WebExtension/manifest.json', dest: 'dist' },
                { src: 'WebExtension/icons/*', dest: 'dist/icons' },
                { src: 'WebExtension/utils/**/*', dest: 'dist/utils' },
                { src: 'WebExtension/sidebar/**/*', dest: 'dist/sidebar' },
                { src: 'WebExtension/css/**/*', dest: 'dist/css' },
                { src: 'WebExtension/images/**/*', dest: 'dist/images' },
                { src: 'WebExtension/options/**/*', dest: 'dist/options' },
                { src: 'WebExtension/viewer/**/*', dest: 'dist/viewer' },
                { src: 'WebExtension/popup/**/*', dest: 'dist/popup' },
                { src: 'WebExtension/pageAction/**/*', dest: 'dist/pageAction' },
                { src: 'WebExtension/deepsearch/**/*', dest: 'dist/deepsearch' },
                { src: 'WebExtension/parsers/**/*', dest: 'dist/parsers' },
                { src: 'WebExtension/_locales/**/*', dest: 'dist/_locales' },
                {
                    src: 'node_modules/exifreader/dist/exif-reader.js',
                    dest: 'dist/lib/',
                    rename: 'exifreader.js',
                },
            ],
            copyOnce: true,
        }),
        // prettier({
        //     parser: 'babel',
        //     tabWidth: 4,
        //     singleQuote: true,
        //     trailingComma: 'es5',
        //     printWidth: 100,
        // }),
        webExtHook(),
    ],
    external: [
        // Add any external dependencies that should not be bundled
    ],
    watch: {
        include: [
            'WebExtension/**',
            'package.json',
            'tsconfig.json',
            'rollup.config.js',
            'WebExtension/css/**',
            'WebExtension/css/hover_styles.css',
            'WebExtension/content-script.js',
            'src/**',
        ],
    },
};
