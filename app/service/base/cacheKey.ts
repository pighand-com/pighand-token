/**
 * 缓存key
 */
export default (
    projectId: number | string,
    platform: string,
    appid: string,
) => {
    return `${projectId}_${platform}_${appid}`;
};
