import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export default class RedisService {
    constructor(@Inject(CACHE_MANAGER) private _cacheService: Cache) { }

    public async Set(key: string, value: any, ttl?: number) {
        return await this._cacheService.set(key, JSON.stringify(value), ttl);  // Pass ttl directly
    }


    public async Get(key: string) {
        const data = await this._cacheService.get(key);
        return typeof data === 'string' ? JSON.parse(data) : null;
    }

    public async Delete(key: string) {
        return await this._cacheService.del(key);
    }
}
