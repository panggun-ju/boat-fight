import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateImage(prompt, filename) {
    console.log(`Generating ${filename}...`);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: prompt,
            config: {
                imageConfig: { aspectRatio: "1:1", imageSize: "512px" }
            }
        });
        const base64 = response.candidates[0].content.parts[0].inlineData.data;
        const dir = path.dirname(filename);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filename, Buffer.from(base64, 'base64'));
        console.log(`Saved ${filename}`);
    } catch (e) {
        console.error(`Failed to generate ${filename}:`, e);
    }
}

async function main() {
    await generateImage(
        "A top-down 2D game asset of a beautiful wooden rowboat. Pixel art style, highly detailed, vibrant colors. The boat is pointing upwards. Solid dark blue background.",
        "public/boat.png"
    );
    await generateImage(
        "A seamless top-down 2D texture of deep blue ocean water with subtle stylized waves. Pixel art style, vibrant colors.",
        "public/water.png"
    );
}

main();
