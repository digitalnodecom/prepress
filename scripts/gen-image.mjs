// Generate one stock image for a library set with Google's Gemini image model.
//   node scripts/gen-image.mjs <out.png> <aspect, e.g. 4:5|16:9|2:3> "<prompt>" [model]
// The key is read from ~/.config/prepress/gemini-key (never commit it). Default model:
// gemini-3-pro-image at 2K. Convert to ~1400–1600px JPEG (sips -s format jpeg -s formatOptions 68 -Z 1600)
// and upload to _library/<demo>/ in the bucket; files there are cached as immutable, so a
// changed picture needs a new file name.
import { readFileSync, writeFileSync } from 'node:fs';
const [out, aspect, prompt, model = 'gemini-3-pro-image'] = process.argv.slice(2);
const key = readFileSync(`${process.env.HOME}/.config/prepress/gemini-key`, 'utf8').trim();
for (let attempt = 1; attempt <= 3; attempt++) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect, imageSize: '2K' } } }),
  });
  const j = await r.json();
  const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (part) { writeFileSync(out, Buffer.from(part.inlineData.data, 'base64')); console.log('ok', out); process.exit(0); }
  console.error('fail', attempt, r.status, JSON.stringify(j).slice(0, 300));
}
process.exit(1);
