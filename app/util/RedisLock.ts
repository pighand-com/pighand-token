import Redis from '../../config/db/Redis';

/**
 * redis 分布式锁
 */
class RedisLock {
    /**
     * 锁失效时间
     */
    lockEX: number;

    /**
     * 等待锁超时时间
     */
    waitTimeout: number;

    constructor(lockEX: number, waitTimeout: number) {
        this.lockEX = lockEX;
        this.waitTimeout = waitTimeout;
    }

    /**
     * redis上锁
     * @param beginTime 开始时间，判断超时
     * @param waitTimeout   超时时间
     * @param key
     * @param value
     * @param lockEX
     * @returns
     */
    private async redisLock(
        beginTime: number,
        key: string,
        value: string,
    ): Promise<boolean> {
        const result = await Redis.client.set(key, value, {
            EX: this.lockEX,
            NX: true,
        });

        if (result === 'OK') {
            return true;
        }

        // 锁超时
        if (Math.floor((Date.now() - beginTime) / 1000) > this.waitTimeout) {
            console.error(`${key} ${value} 上锁重试超时`);
            return false;
        }

        await new Promise((f) => setTimeout(f, 500));

        return await this.redisLock(beginTime, key, value);
    }

    /**
     * 加锁
     * @param key
     * @param value
     * @returns boolean
     */
    async lock(key: string, value: string) {
        return await this.redisLock(Date.now(), key, value);
    }

    /**
     * 释放锁
     * @param key
     * @param value
     * @returns boolean
     */
    async unLock(key: string, value: string) {
        const script = `
            if redis.call('get',KEYS[1]) == ARGV[1] then
                return redis.call('del',KEYS[1])
            else
                return 0
            end
        `;
        const result = await Redis.client.eval(script, {
            keys: [key],
            arguments: [value],
        });

        if (result === 1) {
            return true;
        }

        return false;
    }
}

export default RedisLock;
