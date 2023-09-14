import { Document, Schema, model } from 'mongoose';

interface IToken extends Document {
    projectId: string;
    userId: string;
    platform: string;
    accessToken: string;
    expiresTime: number;
    refreshToken: string;
    refreshExpiresTime: number;
}

let schema = new Schema(
    {
        projectId: String,
        userId: String,
        platform: String,
        accessToken: String,
        expiresTime: Number,
        refreshToken: String,
        refreshExpiresTime: Number,
    },
    { strict: true, versionKey: false },
);

schema.index({ projectId: 1, userId: 1, platform: 1 });
schema.index({ expiresTime: 1 });

export default model<IToken>('token_user', schema, 'token_user');
