import * as KoaBody from 'koa-body';
import * as KoaStatic from 'koa-static';
import * as KoaHelmet from 'koa-helmet';

import Mysql from './config/db/Mysql';
import Mongo from './config/db/Mongo';
import Redis from './config/db/Redis';

import {
    PighandFramework,
    corsDomain,
    apiInfo,
    errorHandler,
} from '@pighand/pighand-framework-koa';

import config from './config/config';
import Schedule from './app/service/Schedule';

const { app } = PighandFramework({
    router_config: {
        appMiddleware: [
            KoaStatic(__dirname + '/public'),
            KoaBody({ multipart: true }),
            KoaHelmet(),
            corsDomain,
            apiInfo,
            errorHandler,
        ],
        controllers: [__dirname + '/app/controller/**/*'],
    },
});

app.listen(config.port, async () => {
    // 连接数据库
    await Promise.all([Mysql.connect(), Mongo.connect(), Redis.connect()]);

    // 启动定时任务，刷新过期token
    if (config.is_enable_schedule) {
        Schedule.run();
    }

    console.log(`服务已启动，端口号： ${config.port}`);
});
