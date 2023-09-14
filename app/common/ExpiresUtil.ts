import config from '../../config/config';

/**
 * 当前时间戳，单位秒
 * @returns
 */
export const getNow = () => {
    return Date.now() / 1000;
};

/**
 * 失效时间，单位秒
 * @param expiresIn
 * @returns
 */
export const expiresTTL = (expiresIn: number) => {
    if (!expiresIn) {
        return 0;
    }

    return expiresIn - (config.token_premature_failure || 0);
};

/**
 * expiresIn转换为expiresTime
 * @param expiresIn 单位秒
 * @param now 当前时间戳
 *
 * @returns expiresTime 单位秒
 */
export const expiresIn2Time = (expiresIn: number, now?: number) => {
    if (!expiresIn) {
        return null;
    }

    return expiresTTL(expiresIn) + (now || getNow());
};

/**
 * 判断token是否过期
 * @param expiresTime 单位秒
 *
 * @return true: token过期
 */
export const isTokenExpired = (expiresTime: number) => {
    return expiresTime && expiresTime <= getNow();
};
