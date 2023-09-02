const { ethers } = require('hardhat');

const ORACLES = {
    SaucerSwapV2Oracle: {
        factory: '0x000000000000000000000000000000000000e0c9',
        validPair: {
            tokenA: '0x000000000000000000000000000000000000e6a2',
            tokenAName: 'WHBAR',
            tokenB: '0x000000000000000000000000000000000000ef52',
            tokenBName: 'SAUCE',
        },
        validPairHbar: {
            tokenA: ethers.constants.AddressZero,
            tokenAName: 'HBAR',
            tokenB: '0x000000000000000000000000000000000006d595',
            tokenBName: 'CLXY',
        },
        address: '0x73CC0372e9a1e95BC61160EccAc0F0eA58Aec503',
        router: '0x000000000000000000000000000000000000e8df',
        aggregatorId: 'SaucerSwapV2',
        tokensToAssociate: [
            '0.0.58850', '0.0.59042', '0.0.61266', '0.0.117947', '0.0.143056',
            '0.0.143063', '0.0.447892', '0.0.447893', '0.0.447894', '0.0.447895'
        ],
        whbar: '0x000000000000000000000000000000000000e6a2',
        adapterContract: 'SaucerSwapAdapter',
    },
    // PangolinV2Oracle: {
    //     factory: '0x0000000000000000000000000000000000070297',
    //     validPair: {
    //         tokenA: '0x000000000000000000000000000000000002690a',
    //         tokenAName: 'WHBAR',
    //         tokenB: '0x00000000000000000000000000000000000274a3',
    //         tokenBName: 'USDC',
    //     },
    //     validPairHbar: {
    //         tokenA: ethers.constants.AddressZero,
    //         tokenAName: 'HBAR',
    //         tokenB: '0x0000000000000000000000000000000000070293',
    //         tokenBName: 'PBAR',
    //     },
    //     address: '0x5fae1453f35450E7eBfD1F278DA9cb5ca3DC270b',
    //     router: '0x000000000000000000000000000000000007029a',
    //     aggregatorId: 'Pangolin',
    //     tokensToAssociate: ['0.0.157962', '0.0.160931',  '0.0.459411'],
    //     whbar: '0x000000000000000000000000000000000002690a',
    //     adapterContract: 'PangolinAdapter',
    // },
};

module.exports = { ORACLES };