import fetch from 'node-fetch';
import { Observable, from, map, of } from 'rxjs';
import { Cache } from './cache.type';
import { Player } from './player.type';
import { StatusResponse } from './status-response.type';

export class MinecraftServerStatusApiClient {
    private static readonly CacheTTL: number = 30000;

    private static StatusEndpoint = `https://api.mcsrvstat.us/3`;
    private static Cache = new Map<string, Cache>();

    constructor() {}

    getPlayersList(server: string, now: Date = new Date()): Observable<Player[]> {
        return this.getServerStatus(server, now).pipe(
            map((response) => response.players.list || []),
        );
    }

    getNumberOfOnlinePlayers(server: string, now: Date = new Date()): Observable<number> {
        return this.getServerStatus(server, now).pipe(map((response) => response.players.online));
    }

    private getServerStatus(server: string, now: Date): Observable<StatusResponse> {
        const cached = this.getCache(server);

        if (this.isCacheOutdated(cached, now)) {
            return from(
                this.fetchServerStatus(server).then((response) => {
                    this.updateCache(server, now, response);

                    return response;
                }),
            );
        } else {
            return of(cached?.response);
        }
    }

    private async fetchServerStatus(server: string): Promise<StatusResponse> {
        return fetch(`${MinecraftServerStatusApiClient.StatusEndpoint}/${server}`).then(
            (response) => response.json() as unknown as StatusResponse,
        );
    }

    private getCache(server: string): Cache | undefined {
        return MinecraftServerStatusApiClient.Cache.get(server);
    }

    private isCacheOutdated(cached: Cache | undefined, now: Date): boolean {
        return !(
            cached?.timestamp && +cached.timestamp + MinecraftServerStatusApiClient.CacheTTL < +now
        );
    }

    private updateCache(server: string, timestamp: Date, response: StatusResponse): void {
        MinecraftServerStatusApiClient.Cache.set(server, {
            timestamp: timestamp,
            response: response,
        });
    }
}
