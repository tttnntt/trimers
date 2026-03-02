"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadObject = uploadObject;
exports.getSignedDownloadUrl = getSignedDownloadUrl;
exports.deleteObject = deleteObject;
exports.getPublicUrl = getPublicUrl;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const BUCKET = process.env.S3_BUCKET || 'trimers';
const REGION = process.env.S3_REGION || 'us-east-1';
const ENDPOINT = process.env.S3_ENDPOINT;
const USE_SSL = process.env.S3_USE_SSL !== 'false';
const client = new client_s3_1.S3Client({
    region: REGION,
    ...(ENDPOINT && {
        endpoint: ENDPOINT,
        forcePathStyle: true
    }),
    credentials: process.env.S3_ACCESS_KEY_ID ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    } : undefined
});
async function uploadObject(key, body, contentType) {
    await client.send(new client_s3_1.PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType
    }));
    return key;
}
async function getSignedDownloadUrl(key, expiresIn = 3600) {
    const cmd = new client_s3_1.GetObjectCommand({ Bucket: BUCKET, Key: key });
    return (0, s3_request_presigner_1.getSignedUrl)(client, cmd, { expiresIn });
}
async function deleteObject(key) {
    await client.send(new client_s3_1.DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
function getPublicUrl(key) {
    if (process.env.S3_PUBLIC_URL) {
        return `${process.env.S3_PUBLIC_URL}/${key}`;
    }
    return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}
