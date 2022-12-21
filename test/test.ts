process.env.NODE_ENV = 'dev';

import config from '../config/config';
import Mysql from '../config/db/Mysql';
import Mongo from '../config/db/Mongo';
import Redis from '../config/db/Redis';
import { saveTarget } from '../app/service/base/PlatformAbstract';
import Service from '../app/service/Service';
import PlatformEnum from '../app/service/base/PlatformEnum';

const testProjectId = '1';
const testAppid = 'XXX';

beforeAll(async () => {
    await Promise.all([Mysql.connect(), Mongo.connect(), Redis.connect()]);
});

test('save target', async () => {
    config.save_model = ['auto'];
    expect(saveTarget().isCache).toEqual(true);
    expect(saveTarget().isRedis).toEqual(false);
    expect(saveTarget().isMysql).toEqual(false);
    expect(saveTarget().isMongo).toEqual(false);
});

test('get new token', async () => {
    const token = await Service.getAccessToken(
        testProjectId,
        PlatformEnum.WECHAT,
        testAppid,
    );

    expect(token).not.toBeNull();
    expect(token).not.toBeUndefined();
});

test('refresh token', async () => {
    const oldToken = await Service.getAccessToken(
        testProjectId,
        PlatformEnum.WECHAT,
        testAppid,
    );

    const newToken = await Service.refreshAccessToken(
        testProjectId,
        PlatformEnum.WECHAT,
        testAppid,
    );

    const dbToken = await Service.getAccessToken(
        testProjectId,
        PlatformEnum.WECHAT,
        testAppid,
    );

    expect(oldToken).not.toEqual(dbToken);
    expect(newToken).toEqual(dbToken);
});
