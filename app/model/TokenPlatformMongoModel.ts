import { Document, Schema, model } from 'mongoose';

interface IToken extends Document {
    projectId: string;
    platform: string;
    appid: string;
    secret: string;
    accessToken: string;
    expiresTime: number;
}

let schema = new Schema(
    {
        projectId: String,
        platform: String,
        appid: String,
        secret: String,
        accessToken: String,
        expiresTime: Number,
    },
    { strict: true, versionKey: false },
);

schema.index({ projectId: 1, platform: 1, appid: 1 });
schema.index({ expiresTime: 1 });

export default model<IToken>('token_platform', schema, 'token_platform');
