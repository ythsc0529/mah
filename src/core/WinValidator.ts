import type { Tile, Meld } from './MahjongEngine';

export interface WinResult {
    isWin: boolean;
    combinations: Meld[][]; // Lists of all possible ways to form the 5 melds + 1 pair
}

export class WinValidator {
    static getAllTileFaces(): { type: string; value: any }[] {
        const faces: { type: string; value: any }[] = [];
        const suits = ['character', 'bamboo', 'dot'];
        for (const suit of suits) {
            for (let i = 1; i <= 9; i++) faces.push({ type: suit, value: i });
        }
        const winds = ['east', 'south', 'west', 'north'];
        for (const w of winds) faces.push({ type: 'wind', value: w });
        const dragons = ['red', 'green', 'white'];
        for (const d of dragons) faces.push({ type: 'dragon', value: d });
        return faces;
    }

    static getWaitingTiles(hand: Tile[], melds: Meld[]): { type: string, value: any }[] {
        const faces = this.getAllTileFaces();
        const waiting: { type: string, value: any }[] = [];
        for (const face of faces) {
            const mockTile: Tile = { id: `mock-${face.type}-${face.value}`, type: face.type as any, value: face.value as any };
            if (this.checkHu(hand, melds, mockTile).isWin) {
                waiting.push(face);
            }
        }
        return waiting;
    }

    static checkHu(hand: Tile[], melds: Meld[], extraTile?: Tile): WinResult {
        const fullHand = [...hand];
        if (extraTile) fullHand.push(extraTile);

        const counts: Record<string, number> = {};
        const tileMap: Record<string, Tile> = {}; // Reference to reconstruct Tiles

        for (const t of fullHand) {
            const key = `${t.type}-${t.value}`;
            counts[key] = (counts[key] || 0) + 1;
            tileMap[key] = t;
        }

        if (fullHand.length % 3 !== 2) return { isWin: false, combinations: [] };

        const possiblePairs = Object.keys(counts).filter(k => counts[k] >= 2);
        const validPaths: Meld[][] = [];

        for (const pairKey of possiblePairs) {
            const remainingCounts = { ...counts };
            remainingCounts[pairKey] -= 2;
            if (remainingCounts[pairKey] === 0) delete remainingCounts[pairKey];

            const meldPaths = this.findMeldsPaths(remainingCounts, tileMap);

            for (const path of meldPaths) {
                // Create the pair meld
                const pairMeld: Meld = {
                    type: 'pong', // Technically a pair, but we just need the tiles
                    tiles: [tileMap[pairKey], tileMap[pairKey]]
                };
                validPaths.push([...melds, pairMeld, ...path]);
            }
        }

        return {
            isWin: validPaths.length > 0,
            combinations: validPaths
        };
    }

    // Returns all possible paths to reduce the given counts to 0
    private static findMeldsPaths(counts: Record<string, number>, tileMap: Record<string, Tile>): Meld[][] {
        const keys = Object.keys(counts).filter(k => counts[k] > 0);
        if (keys.length === 0) return [[]];

        keys.sort();
        const firstKey = keys[0];
        const count = counts[firstKey];
        const results: Meld[][] = [];

        // Try Triplet (Pong)
        if (count >= 3) {
            counts[firstKey] -= 3;
            const subPaths = this.findMeldsPaths(counts, tileMap);
            if (subPaths.length > 0) {
                const pongMeld: Meld = {
                    type: 'pong',
                    tiles: [tileMap[firstKey], tileMap[firstKey], tileMap[firstKey]]
                };
                for (const p of subPaths) {
                    results.push([pongMeld, ...p]);
                }
            }
            counts[firstKey] += 3;
        }

        // Try Sequence (Chow)
        const parts = firstKey.split('-');
        const type = parts[0];
        const val = parseInt(parts[1], 10);

        if (type === 'character' || type === 'bamboo' || type === 'dot') {
            const next1 = `${type}-${val + 1}`;
            const next2 = `${type}-${val + 2}`;

            if (counts[firstKey] > 0 && counts[next1] > 0 && counts[next2] > 0) {
                counts[firstKey] -= 1;
                counts[next1] -= 1;
                counts[next2] -= 1;

                const subPaths = this.findMeldsPaths(counts, tileMap);
                if (subPaths.length > 0) {
                    const chowMeld: Meld = {
                        type: 'chow',
                        tiles: [tileMap[firstKey], tileMap[next1], tileMap[next2]]
                    };
                    for (const p of subPaths) {
                        results.push([chowMeld, ...p]);
                    }
                }

                counts[firstKey] += 1;
                counts[next1] += 1;
                counts[next2] += 1;
            }
        }

        return results;
    }
}
