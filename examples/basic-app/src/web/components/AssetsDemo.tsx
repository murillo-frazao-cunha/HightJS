/**
 * Example component demonstrating asset imports in HightJS
 *
 * This shows how to import various file types like .md, .png, .json, etc.
 */

import React from 'react';

// Example: Import markdown file
// import readme from './example.md';

// Example: Import JSON file
// import config from './config.json';

// Example: Import image
// import logo from './logo.png';

// Example: Import SVG (two ways)
// import icon, { svgContent } from './icon.svg';

export default function AssetsDemo() {
    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1>HightJS Asset Import Demo</h1>

            <section style={{ marginTop: '2rem' }}>
                <h2>📄 Markdown Import</h2>
                <p>You can import .md files as strings:</p>
                <pre style={{
                    background: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto'
                }}>
{`import readme from './README.md';

function Component() {
  return <pre>{readme}</pre>;
}`}
                </pre>
            </section>

            <section style={{ marginTop: '2rem' }}>
                <h2>🖼️ Image Import</h2>
                <p>Import images (PNG, JPG, GIF, WebP, etc.) as base64 data URLs:</p>
                <pre style={{
                    background: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto'
                }}>
{`import logo from './logo.png';

function Component() {
  return <img src={logo} alt="Logo" />;
}`}
                </pre>
            </section>

            <section style={{ marginTop: '2rem' }}>
                <h2>🎨 SVG Import</h2>
                <p>SVG files can be imported as data URL or raw content:</p>
                <pre style={{
                    background: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto'
                }}>
{`import icon, { svgContent } from './icon.svg';

function Component() {
  return (
    <>
      <img src={icon} alt="Icon" />
      <div dangerouslySetInnerHTML={{ __html: svgContent }} />
    </>
  );
}`}
                </pre>
            </section>

            <section style={{ marginTop: '2rem' }}>
                <h2>📋 JSON Import</h2>
                <p>Import JSON files as JavaScript objects:</p>
                <pre style={{
                    background: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto'
                }}>
{`import config from './config.json';

function Component() {
  return <p>Version: {config.version}</p>;
}`}
                </pre>
            </section>

            <section style={{ marginTop: '2rem' }}>
                <h2>📝 Text File Import</h2>
                <p>Import .txt files as strings:</p>
                <pre style={{
                    background: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto'
                }}>
{`import terms from './terms.txt';

function Component() {
  return <pre>{terms}</pre>;
}`}
                </pre>
            </section>

            <section style={{ marginTop: '2rem' }}>
                <h2>🎵 Audio Import</h2>
                <p>Import audio files (MP3, WAV, OGG, etc.):</p>
                <pre style={{
                    background: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto'
                }}>
{`import music from './song.mp3';

function Component() {
  return <audio src={music} controls />;
}`}
                </pre>
            </section>

            <section style={{ marginTop: '2rem' }}>
                <h2>🎬 Video Import</h2>
                <p>Import video files (MP4, WebM, OGV):</p>
                <pre style={{
                    background: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto'
                }}>
{`import video from './demo.mp4';

function Component() {
  return <video src={video} controls />;
}`}
                </pre>
            </section>

            <section style={{ marginTop: '2rem' }}>
                <h2>🔤 Font Import</h2>
                <p>Import font files (WOFF, WOFF2, TTF, OTF, EOT):</p>
                <pre style={{
                    background: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto'
                }}>
{`import customFont from './custom-font.woff2';

const style = document.createElement('style');
style.textContent = \`
  @font-face {
    font-family: 'CustomFont';
    src: url(\${customFont}) format('woff2');
  }
\`;
document.head.appendChild(style);`}
                </pre>
            </section>

            <div style={{
                marginTop: '3rem',
                padding: '1rem',
                background: '#e3f2fd',
                borderRadius: '4px',
                borderLeft: '4px solid #2196f3'
            }}>
                <h3>✨ Benefits</h3>
                <ul>
                    <li><strong>Type Safety</strong>: Full TypeScript support with auto-completion</li>
                    <li><strong>No Build Config</strong>: Works out of the box</li>
                    <li><strong>Optimized</strong>: Assets are bundled and optimized automatically</li>
                    <li><strong>Base64 Encoding</strong>: Files are inlined as data URLs, reducing HTTP requests</li>
                </ul>
            </div>
        </div>
    );
}

