/**
 * 本地缓存
 *
 * 如果不使用mysql、mongo存储appid和secret，可以直接写到cache中
 * 格式：
 * {
 *      token: '',
 *      expireTime: 0,
 *      appid: 'XXX',
 *      secret: 'YYY',
 *      projectId: '',
 *      platform: '',
 * }
 */
class MemoryCache {
    cache = new Map();

    constructor() {
        // cache demo
        // this.cache.set('1_wechat_XXX', {
        //     token: '',
        //     expireTime: 0,
        //     appid: 'XXX',
        //     secret: 'YYY',
        //     projectId: '1',
        //     platform: 'wechat',
        // });
    }

    /**
     * cache详情
     * @param key
     * @returns {object} cache info
     */
    getCacheInfo(key: string) {
        return this.cache.get(key);
    }

    /**
     * cache中获取token
     * @param key
     * @returns {string} token
     */
    get(key: string) {
        const tokenInfo = this.cache.get(key);
        const { token, expireTime } = tokenInfo || {};

        if (expireTime && expireTime > Date.now()) {
            return token;
        }

        return;
    }

    /**
     * 设置token
     * @param key
     * @param token
     * @param expireTime
     */
    set(key: string, token: string, expireTime: number) {
        const tokenInfo = this.cache.get(key) || {};
        this.cache.set(key, {
            ...tokenInfo,
            token,
            expireTime,
        });
    }
}

export default new MemoryCache();
