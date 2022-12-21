// ----------------------------
// Collection structure for token
// ----------------------------
db.getCollection("token").drop();
db.createCollection("token");
db.getCollection("token").createIndex({
    projectId: NumberInt("1"),
    platform: NumberInt("1"),
    appid: NumberInt("1")
}, {
    name: "projectId_1_platform_1_appid_1",
    background: true
});
db.getCollection("token").createIndex({
    expireTime: NumberInt("1")
}, {
    name: "expireTime_1",
    background: true
});
