import { Document, Schema, model } from 'mongoose';

interface IToken extends Document {
    projectId: string;
    platform: string;
    type: string;
    appid: string;
    secret: string;
    token: string;
    expireTime: number;
}

let schema = new Schema(
    {
        projectId: String,
        platform: String,
        type: String,
        appid: String,
        secret: String,
        token: String,
        expireTime: Number,
    },
    { strict: true, versionKey: false },
);

schema.index({ projectId: 1, platform: 1, appid: 1 });
schema.index({ expireTime: 1 });

export default model<IToken>('token', schema, 'token');
