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
        address: '0xbBF03c93378F6FeeF479F9912542f98A5dF04401',
        router: '0x000000000000000000000000000000000000e8df',
        aggregatorId: 'SaucerSwapV2',
        tokensToAssociate: [
            '0.0.58850', '0.0.59042', '0.0.61266', '0.0.117947', '0.0.143056',
            '0.0.143063', '0.0.447892', '0.0.447893', '0.0.447894', '0.0.447895'
        ],
        whbarToken: '0x000000000000000000000000000000000000e6a2',
        whbarContract: '0x000000000000000000000000000000000000e6a1',
        adapterContract: 'SaucerSwapAdapter',
    },
    PangolinV2Oracle: {
        factory: '0x0000000000000000000000000000000000070297',
        validPair: {
            tokenA: '0x000000000000000000000000000000000002690a',
            tokenAName: 'WHBAR',
            tokenB: '0x00000000000000000000000000000000000274a3',
            tokenBName: 'USDC',
        },
        validPairHbar: {
            tokenA: ethers.constants.AddressZero,
            tokenAName: 'HBAR',
            tokenB: '0x0000000000000000000000000000000000070293',
            tokenBName: 'PBAR',
        },
        address: '0x5d357e3a90F1A244f0582BCB659eDC3a873F291C',
        router: '0x000000000000000000000000000000000007029a',
        aggregatorId: 'Pangolin',
        tokensToAssociate: ['0.0.157962', '0.0.160931',  '0.0.459411'],
        whbarToken: '0x000000000000000000000000000000000002690a',
        whbarContract: '0x0000000000000000000000000000000000026909',
        adapterContract: 'PangolinAdapter',
    },
};

module.exports = { ORACLES };