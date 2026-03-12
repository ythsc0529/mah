import { WinValidator } from './WinValidator';

export type Suit = 'character' | 'bamboo' | 'dot';
export type Wind = 'east' | 'south' | 'west' | 'north';
export type Dragon = 'red' | 'green' | 'white';

export interface Tile {
    id: string; // unique identifier, e.g., 'character-1-0'
    type: Suit | 'wind' | 'dragon';
    value: number | Wind | Dragon;
}

export type MeldType = 'chow' | 'pong' | 'kong' | 'concealed_kong';

export interface Meld {
    type: MeldType;
    tiles: Tile[];
    fromPlayer?: number; // the index of the player who discarded the tile
}

export interface Player {
    id: string;
    name: string;
    isNPC: boolean;
    hand: Tile[];       // 門後 (Hidden hand)
    melds: Meld[];      // 門前 (Disclosed melds / Kongs)
    discards: Tile[];   // Discarded tiles
    flowers: Tile[];    // Kept empty since we use 136 standard tiles for simplicity based on rules
    points: number;
}

export class MahjongEngine {
    deck: Tile[] = [];
    players: Player[] = [];

    dealerIndex: number = 0;
    currentTurn: number = 0;

    // Winds for UI calculation
    roundWind: Wind = 'east';

    constructor() {
        this.deck = this.generateDeck();
        this.shuffle();
    }

    generateDeck(): Tile[] {
        const newDeck: Tile[] = [];
        const suits: Suit[] = ['character', 'bamboo', 'dot'];
        const winds: Wind[] = ['east', 'south', 'west', 'north'];
        const dragons: Dragon[] = ['red', 'green', 'white'];

        // Add suits (萬, 條, 筒)
        for (const suit of suits) {
            for (let i = 1; i <= 9; i++) {
                for (let j = 0; j < 4; j++) {
                    newDeck.push({ id: `${suit}-${i}-${j}`, type: suit, value: i });
                }
            }
        }

        // Add winds (東, 南, 西, 北)
        for (const wind of winds) {
            for (let j = 0; j < 4; j++) {
                newDeck.push({ id: `wind-${wind}-${j}`, type: 'wind', value: wind });
            }
        }

        // Add dragons (中, 發, 白)
        for (const dragon of dragons) {
            for (let j = 0; j < 4; j++) {
                newDeck.push({ id: `dragon-${dragon}-${j}`, type: 'dragon', value: dragon });
            }
        }
        
        return newDeck;
    }

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    initializePlayers(humanName: string = "Player", npcNames: string[] = ["NPC 1", "NPC 2", "NPC 3"]) {
        // Player 0 is local user, 1-3 are NPCs by default
        this.players = [
            { id: 'p0', name: humanName, isNPC: false, hand: [], melds: [], discards: [], flowers: [], points: 0 },
            { id: 'p1', name: npcNames[0], isNPC: true, hand: [], melds: [], discards: [], flowers: [], points: 0 },
            { id: 'p2', name: npcNames[1], isNPC: true, hand: [], melds: [], discards: [], flowers: [], points: 0 },
            { id: 'p3', name: npcNames[2], isNPC: true, hand: [], melds: [], discards: [], flowers: [], points: 0 },
        ];
    }

    dealTiles(dealerIndex: number = 0) {
        this.deck = this.generateDeck();
        this.shuffle();

        this.dealerIndex = dealerIndex;
        this.currentTurn = dealerIndex;

        // Reset players' hands
        for (const p of this.players) {
            p.hand = [];
            p.melds = [];
            p.discards = [];
        }

        // In Taiwanese 16-tile, deal 16 tiles to everyone.
        for (let i = 0; i < 16; i++) {
            for (let p = 0; p < 4; p++) {
                const tile = this.deck.pop();
                if (tile) this.players[p].hand.push(tile);
            }
        }

        // Dealer gets 17th tile
        const extraDealerTile = this.deck.pop();
        if (extraDealerTile) {
            this.players[this.dealerIndex].hand.push(extraDealerTile);
        }

        // Sort hands for readability
        for (const p of this.players) {
            this.sortHand(p.hand);
        }
    }

    sortHand(hand: Tile[]) {
        hand.sort((a, b) => {
            // Order: Character -> Bamboo -> Dot -> Wind -> Dragon
            const typeOrder = { character: 1, bamboo: 2, dot: 3, wind: 4, dragon: 5 };
            if (typeOrder[a.type] !== typeOrder[b.type]) {
                return typeOrder[a.type] - typeOrder[b.type];
            }

            // Secondary order: value
            if (typeof a.value === 'number' && typeof b.value === 'number') {
                return a.value - b.value;
            }

            const windOrder = { east: 1, south: 2, west: 3, north: 4 };
            if (a.type === 'wind' && typeof a.value === 'string' && typeof b.value === 'string') {
                return (windOrder[a.value as Wind] || 0) - (windOrder[b.value as Wind] || 0);
            }

            const dragonOrder = { red: 1, green: 2, white: 3 };
            if (a.type === 'dragon' && typeof a.value === 'string' && typeof b.value === 'string') {
                return (dragonOrder[a.value as Dragon] || 0) - (dragonOrder[b.value as Dragon] || 0);
            }

            return 0;
        });
    }

    drawTile(playerIndex: number): Tile | null {
        if (this.deck.length === 0) return null; // Game draw / 流局
        const tile = this.deck.pop();
        if (tile) {
            this.players[playerIndex].hand.push(tile);
        }
        return tile || null;
    }

    discardTile(playerIndex: number, tileId: string): Tile | null {
        const p = this.players[playerIndex];
        const index = p.hand.findIndex(t => t.id === tileId);
        if (index === -1) return null;

        const [discarded] = p.hand.splice(index, 1);
        this.sortHand(p.hand); // Sort after discarding
        p.discards.push(discarded);

        return discarded;
    }

    getAvailableActions(discardingPlayerIndex: number, discardedTile: Tile | null): { playerIndex: number; actions: string[] }[] {
        const available: { playerIndex: number; actions: string[] }[] = [];

        for (let i = 0; i < 4; i++) {
            const p = this.players[i];
            const actions: string[] = [];

            if (discardedTile !== null && i !== discardingPlayerIndex) {
                // Check Pong / Kong (Exposed)
                const isNextPlayer = (discardingPlayerIndex + 1) % 4 === i; // 上家
                const matchingTiles = p.hand.filter(t => t.type === discardedTile.type && t.value === discardedTile.value);
                
                if (matchingTiles.length >= 2) actions.push('pong');
                // Exposed Kong: Cannot Kong from the player to the left (上家)
                if (matchingTiles.length === 3 && !isNextPlayer) actions.push('kong'); 

                // Check Chow: Can only eat from the player to the left (上家)
                if (isNextPlayer && (discardedTile.type === 'character' || discardedTile.type === 'bamboo' || discardedTile.type === 'dot')) {
                    const type = discardedTile.type;
                    const val = discardedTile.value as number;
                    
                    const hasTile = (v: number) => p.hand.some(t => t.type === type && t.value === v);
                    
                    if ((hasTile(val - 2) && hasTile(val - 1)) ||
                        (hasTile(val - 1) && hasTile(val + 1)) ||
                        (hasTile(val + 1) && hasTile(val + 2))) {
                        actions.push('chow');
                    }
                }
            } else if (discardedTile === null && i === this.currentTurn) {
                // Check Concealed Kong (暗槓) - Only when it's the player's turn and they haven't discarded yet.
                // Group hand by type and value
                const counts = new Map<string, Tile[]>();
                for (const t of p.hand) {
                     const key = `${t.type}-${t.value}`;
                     if (!counts.has(key)) counts.set(key, []);
                     counts.get(key)!.push(t);
                }
                
                for (const group of counts.values()) {
                     if (group.length === 4) {
                         // We just signal concealed kong is possible. 
                         // To be precise, we need to know WHICH tile, but we'll adapt the UI for it later.
                         actions.push('concealed_kong');
                         break; 
                     }
                }
            }

            // Check Hu (Win)
            const winCheck = WinValidator.checkHu(p.hand, p.melds, discardedTile !== null ? discardedTile : undefined);
            if (winCheck.isWin) {
                actions.push('hu');
            }

            // Note: Hu is usually checked via WinValidator, we can append 'hu' to the actions list later in GameBoard.
            if (actions.length > 0) {
                available.push({ playerIndex: i, actions });
            }
        }

        return available;
    }

    executeAction(playerIndex: number, action: string, targetTile: Tile | null, discardingPlayerIndex: number) {
        const p = this.players[playerIndex];
        
        const removeTiles = (count: number, condition: (t: Tile) => boolean) => {
            const removed: Tile[] = [];
            for (let i = p.hand.length - 1; i >= 0 && removed.length < count; i--) {
                if (condition(p.hand[i])) {
                    removed.push(p.hand.splice(i, 1)[0]);
                }
            }
            return removed;
        };

        let didKong = false;

        if (action === 'pong' && targetTile) {
            const removed = removeTiles(2, t => t.type === targetTile.type && t.value === targetTile.value);
            p.melds.push({ type: 'pong', tiles: [...removed, targetTile], fromPlayer: discardingPlayerIndex });
        } else if (action === 'kong' && targetTile) {
            const removed = removeTiles(3, t => t.type === targetTile.type && t.value === targetTile.value);
            p.melds.push({ type: 'kong', tiles: [...removed, targetTile], fromPlayer: discardingPlayerIndex });
            didKong = true;
        } else if (action === 'concealed_kong') {
            // Find a group of 4
            const counts = new Map<string, Tile[]>();
            for (const t of p.hand) {
                 const key = `${t.type}-${t.value}`;
                 if (!counts.has(key)) counts.set(key, []);
                 counts.get(key)!.push(t);
            }
            for (const [key, group] of counts.entries()) {
                 if (group.length === 4) {
                     const [type, val] = key.split('-');
                     const removed = removeTiles(4, t => t.type === type && String(t.value) === val);
                     p.melds.push({ type: 'concealed_kong', tiles: removed });
                     didKong = true;
                     break;
                 }
            }
        } else if (action === 'chow' && targetTile) {
            // Simplified: grab the first sequence. Real game needs user selection if multiple sequences available.
            const val = targetTile.value as number;
            const hasTile = (v: number) => p.hand.some(t => t.type === targetTile.type && t.value === v);
            
            let combo: number[] = [];
            if (hasTile(val - 2) && hasTile(val - 1)) combo = [val - 2, val - 1];
            else if (hasTile(val - 1) && hasTile(val + 1)) combo = [val - 1, val + 1];
            else if (hasTile(val + 1) && hasTile(val + 2)) combo = [val + 1, val + 2];

            if (combo.length === 2) {
                const r1 = removeTiles(1, t => t.type === targetTile.type && t.value === combo[0])[0];
                const r2 = removeTiles(1, t => t.type === targetTile.type && t.value === combo[1])[0];
                const sortedRest = [r1, r2].sort((a,b) => (a.value as number) - (b.value as number));
                p.melds.push({ type: 'chow', tiles: [sortedRest[0], targetTile, sortedRest[1]], fromPlayer: discardingPlayerIndex });
            }
        }

        // Remove the tile from the discarding player's discards pool if it was a stolen tile
        if (targetTile && action !== 'concealed_kong') {
            const discards = this.players[discardingPlayerIndex].discards;
            const lastDiscardIndex = discards.findIndex(t => t.id === targetTile.id);
            if (lastDiscardIndex !== -1) {
                discards.splice(lastDiscardIndex, 1);
            }
        }

        this.sortHand(p.hand);
        
        // Turn control shifts to the player who interrupted
        this.currentTurn = playerIndex;

        // If kong, you must draw a new tile immediately from the end of the deck
        if (didKong) {
            this.drawTile(playerIndex);
        }
    }
}
