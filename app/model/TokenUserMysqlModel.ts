import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'token_user',
})
class TokenMysqlModel extends Model {
    @Column({
        field: 'project_id',
        type: DataType.BIGINT,
    })
    declare projectId: number;

    @Column({
        field: 'user_id',
        type: DataType.BIGINT,
    })
    declare userId: number;

    @Column(DataType.STRING)
    declare platform: string;

    @Column({
        field: 'access_token',
        type: DataType.STRING,
    })
    declare accessToken: string;

    @Column({
        field: 'expires_time',
        type: DataType.BIGINT,
    })
    declare expiresTime: number;

    @Column({
        field: 'refresh_token',
        type: DataType.STRING,
    })
    declare refreshToken: string;

    @Column({
        field: 'refresh_expires_time',
        type: DataType.BIGINT,
    })
    declare refreshExpiresTime: number;
}

export default TokenMysqlModel;
