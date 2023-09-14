/**
 * 缓存key
 */
export default (
    projectId: number | string,
    platform: string,
    id: number | string,
) => {
    return `${projectId}_${platform}_${id || ''}`;
};
