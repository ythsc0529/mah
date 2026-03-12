import type { Tile, Meld, Player, Wind } from './MahjongEngine';
import { WinValidator } from './WinValidator';
import type { WinResult } from './WinValidator';

export interface GameContext {
    roundWind: Wind;
    dealerIndex: number;
    playerIndex: number;
    isSelfDraw: boolean;
    winningTile: Tile;
    isRobbingKong?: boolean;
    isLastTile?: boolean;
    isKongReplacement?: boolean;
    isMIGI?: boolean;
    isFirstTurn?: boolean;
    baseHand: Tile[]; // The 16-tile hand before the winning tile is added
}

export interface TaiReason {
    name: string;
    tai: number;
}

export interface TaiResult {
    totalTai: number;
    reasons: TaiReason[];
    bestCombination: Meld[];
}

export class TaiCalculator {
    static calculate(winResult: WinResult, player: Player, context: GameContext): TaiResult {
        if (!winResult.isWin || winResult.combinations.length === 0) {
            return { totalTai: 0, reasons: [], bestCombination: [] };
        }

        let bestTaiState: TaiResult = { totalTai: -1, reasons: [], bestCombination: [] };

        // Evaluate all combinations to find the highest scoring one
        for (const combo of winResult.combinations) {
            const result = this.evaluateCombination(combo, player, context);
            if (result.totalTai > bestTaiState.totalTai) {
                bestTaiState = result;
            }
        }

        return bestTaiState;
    }

    private static evaluateCombination(combo: Meld[], player: Player, context: GameContext): TaiResult {
        let totalTai = 0;
        const reasons: TaiReason[] = [];
        const addTai = (name: string, tai: number) => {
            totalTai += tai;
            reasons.push({ name, tai });
        };

        const isDealer = context.dealerIndex === context.playerIndex;
        const playerWind = this.getPlayerWind(context.playerIndex, context.dealerIndex);

        // Flat condition checks from the prompt's Taiwanese 16-tile rules

        // 16 台 (Tai)
        if (context.isFirstTurn && isDealer && context.isSelfDraw) {
            addTai("天胡 (Heavenly Win)", 16);
            return { totalTai, reasons, bestCombination: combo }; // Max out immediately
        }

        let windPongs = 0;
        let windPairs = 0;
        let dragonPongs = 0;
        let dragonPairs = 0;
        let isAllSequences = true;

        for (const m of combo) {
            const type = m.tiles[0].type;
            const isTripletOrKong = m.type === 'pong' || m.type === 'kong' || m.type === 'concealed_kong';
            const isPair = m.type === 'pong' && m.tiles.length === 2; // the pair mapped as pong in WinValidator

            if (isPair) {
                if (type === 'wind') windPairs++;
                if (type === 'dragon') dragonPairs++;
            } else {
                if (m.type === 'chow') {
                    // isAllTriplets unused but logic kept structure
                }
                if (isTripletOrKong) {
                    isAllSequences = false;
                    if (type === 'wind') windPongs++;
                    if (type === 'dragon') dragonPongs++;
                }
            }
        }

        const isConcealed = player.melds.every(m => m.type === 'concealed_kong');

        // 16 台 (Tai)
        if (windPongs === 4) {
            addTai("大四喜 (Big Four Winds)", 16);
        }

        // 8 台 (Tai)
        if (context.isMIGI) addTai("MIGI", 8);

        if (windPongs === 3 && windPairs === 1) addTai("小四喜 (Small Four Winds)", 8);
        else if (dragonPongs === 3) addTai("大三元 (Big Three Dragons)", 8);

        const isAllPongs = combo.every(m => m.tiles.length === 2 || m.type === 'pong' || m.type === 'kong' || m.type === 'concealed_kong');
        const concealedPongCount = combo.filter(m =>
            (m.type === 'pong' || m.type === 'concealed_kong') && m.tiles.length === 3 &&
            (!player.melds.includes(m))
        ).length;
        // Note: The drawn winning tile if it forms a triplet doesn't count as a "concealed" triplet if it's from another player.
        // Simplifying this for local rules logic for now. We assume all hidden triplets are concealed unless completed by ron.

        if (concealedPongCount === 5) addTai("五暗刻 (Five Concealed Triplets)", 8);

        const suitsInHand = new Set(combo.map(m => m.tiles[0].type).filter(t => t !== 'wind' && t !== 'dragon'));
        const hasHonor = combo.some(m => m.tiles[0].type === 'wind' || m.tiles[0].type === 'dragon');

        if (suitsInHand.size === 1 && !hasHonor) addTai("清一色 (Full Flush)", 8);
        if (suitsInHand.size === 0 && hasHonor) addTai("字一色 (All Honors)", 8);

        // 5 台 (Tai)
        if (concealedPongCount === 4) addTai("四暗刻 (Four Concealed Triplets)", 5);

        // 4 台 (Tai)
        if (isAllPongs && !reasons.some(r => r.name.includes('四暗刻') || r.name.includes('五暗刻'))) {
            addTai("碰碰胡 (All Triplets)", 4);
        }
        if (dragonPongs === 2 && dragonPairs === 1) addTai("小三元 (Small Three Dragons)", 4);
        if (suitsInHand.size === 1 && hasHonor) addTai("湊一色 (Half Flush)", 4);

        // 2 台 (Tai)
        if (isAllSequences && isConcealed && !hasHonor && !context.isSelfDraw) {
            // Need strict conditions for Ping Hu. Assuming generic check here.
            addTai("平胡 (All Sequences)", 2);
        }
        if (concealedPongCount === 3) {
            addTai("三暗刻 (Three Concealed Triplets)", 2);
        }
        if (player.melds.length === 5 && !context.isSelfDraw) {
            addTai("全求人 (All Melds & Melded Ron)", 2);
        }

        // 1 台 (Tai)
        if (isDealer) addTai("莊家 (Dealer)", 1);

        if (isConcealed && context.isSelfDraw) addTai("門清一摸三 (Fully Concealed Self Drawn)", 3);
        else {
            if (isConcealed) addTai("門清 (Fully Concealed)", 1);
            if (context.isSelfDraw) addTai("自摸 (Self Draw)", 1);
        }
        
        // 獨聽 (Single Wait / Inside / Edge)
        const waitingTiles = WinValidator.getWaitingTiles(context.baseHand, player.melds);
        if (waitingTiles.length === 1) {
            addTai("獨聽 (中洞/邊張/單吊)", 1);
        }

        if (context.isRobbingKong) addTai("搶槓 (Robbing the Kong)", 1);
        if (context.isKongReplacement && context.isSelfDraw) addTai("槓上開花 (Kong Replacement Win)", 1);
        if (context.isLastTile && context.isSelfDraw) addTai("海底撈月 (Last Tile Draw)", 1);

        // Value tiles (見字) - Dragons, Seat Wind, Round Wind
        for (const m of combo) {
            if ((m.type === 'pong' || m.type === 'kong' || m.type === 'concealed_kong') && m.tiles.length >= 3) {
                if (m.tiles[0].type === 'dragon') {
                    addTai(`見字: ${m.tiles[0].value}`, 1);
                }
                if (m.tiles[0].type === 'wind') {
                    if (m.tiles[0].value === playerWind) addTai(`見字: 門風 ${playerWind}`, 1);
                    if (m.tiles[0].value === context.roundWind) addTai(`見字: 圈風 ${context.roundWind}`, 1);
                }
            }
        }

        return { totalTai, reasons, bestCombination: combo };
    }

    private static getPlayerWind(playerIndex: number, dealerIndex: number): Wind {
        const winds: Wind[] = ['east', 'south', 'west', 'north'];
        // dealer is east
        const offset = (playerIndex - dealerIndex + 4) % 4;
        return winds[offset];
    }
}
