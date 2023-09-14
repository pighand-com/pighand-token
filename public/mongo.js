db.createCollection('token_platform');

// Sample document in the "token_platform" collection
db.token_platform.insertOne({
    project_id: 1,
    platform: 'PlatformName',
    appid: 'AppID',
    secret: 'SecretKey',
    access_token: null,
    expires_time: null,
});

// Create indexes (if needed)
db.token_platform.createIndex({ project_id: 1, expires_time: 1 });
db.token_platform.createIndex({ project_id: 1, platform: 1, appid: 1 });

db.createCollection('token_user');

// Sample document in the "token_user" collection
db.token_user.insertOne({
    project_id: 1,
    user_id: 1,
    platform: 'PlatformName',
    access_token: 'AccessToken',
    expires_time: null,
    refresh_token: null,
    refresh_expires_time: null,
});

// Create indexes (if needed)
db.token_user.createIndex({ project_id: 1, expires_time: 1 });
db.token_user.createIndex({ project_id: 1, platform: 1, user_id: 1 });
