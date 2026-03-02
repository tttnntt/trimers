"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressAndUpload = compressAndUpload;
const sharp_1 = __importDefault(require("sharp"));
const s3_js_1 = require("./s3.js");
const crypto_1 = require("crypto");
const MAX_DIMENSION = 2048;
const QUALITY = 100;
async function compressAndUpload(buffer, mimeType) {
    const metadata = await (0, sharp_1.default)(buffer).metadata();
    const format = mimeType.includes('png') ? 'png' : 'jpeg';
    let pipeline = (0, sharp_1.default)(buffer);
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
            fit: 'inside',
            withoutEnlargement: true
        });
    }
    const output = format === 'png'
        ? await pipeline.png({ quality: QUALITY }).toBuffer()
        : await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    const key = `uploads/${(0, crypto_1.randomUUID)()}.${format === 'png' ? 'png' : 'jpg'}`;
    const contentType = format === 'png' ? 'image/png' : 'image/jpeg';
    await (0, s3_js_1.uploadObject)(key, output, contentType);
    return key;
}
