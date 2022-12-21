import { createClient, RedisClientType } from 'redis';

import { DBAbstract, DBTypeEnum } from './DBAbstract';
import config from '../config';

const {
    redis_host,
    redis_pwd,
    redis_port = 6379,
    redis_db = 0,
    is_cluster,
} = config;

class Redis extends DBAbstract<RedisClientType> {
    constructor() {
        if (is_cluster === true && !redis_host) {
            throw new Error('启用集群模式，但未配置redis');
        }

        super(DBTypeEnum.REDIS, !!redis_host);
    }

    async DBConnect() {
        const configuration: any = {
            socket: {
                host: redis_host,
                port: redis_port,
            },
            database: redis_db,
        };

        if (redis_pwd) {
            configuration.password = redis_pwd;
        }

        const redisClient = createClient(configuration);

        await redisClient.connect();

        return redisClient;
    }
}

const redis = new Redis();

export default redis;
export const client = redis.client;
