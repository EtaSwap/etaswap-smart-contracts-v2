const { ethers } = require('hardhat');

const ORACLES = {
    SaucerSwapV2Oracle: {
        factory: '0x00000000000000000000000000000000001243ee',
        validPair: {
            tokenA: '0x0000000000000000000000000000000000001599',
            tokenAName: 'DAI',
            tokenB: '0x0000000000000000000000000000000000001549',
            tokenBName: 'USDC',
            poolFee: 500,
        },
        validPairHbar: {
            tokenA: '0x0000000000000000000000000000000000003ad2',
            tokenAName: 'HBAR',
            tokenB: '0x0000000000000000000000000000000000120f46',
            tokenBName: 'SAUCE',
            poolFee: 3000,
        },
        // validTriple: {
        //     tokenA: '0x0000000000000000000000000000000000120f46',
        //     tokenAName: 'SAUCE',
        //     tokenB: '0x0000000000000000000000000000000000003ad2',
        //     tokenBName: 'HBAR',
        //     tokenC: '0x0000000000000000000000000000000000022ed7',
        //     tokenCName: 'BBB',
        //     poolFee: 3000,
        // },
        address: '0x00000000000000000000000000000000001535b2',
        router: '0x0000000000000000000000000000000000159398',
        aggregatorId: 'SaucerSwapV2',
        tokensToAssociate: [
            ['0.0.15058', '0.0.2231533', '0.0.1183558', '0.0.5529', '0.0.5449'],
        ],
        whbarToken: '0x0000000000000000000000000000000000003ad2',
        whbarContract: '0x0000000000000000000000000000000000003ad1',
        adapterContract: 'SaucerSwapV2Adapter',
    },
    SaucerSwapOracle: {
        factory: '0x000000000000000000000000000000000000e0c9',
        validPair: {
            tokenA: '0x0000000000000000000000000000000000120f46',
            tokenAName: 'SAUCE',
            tokenB: '0x0000000000000000000000000000000000001549',
            tokenBName: 'USDC',
        },
        validPairHbar: {
            tokenA: '0x0000000000000000000000000000000000003ad2',
            tokenAName: 'HBAR',
            tokenB: '0x0000000000000000000000000000000000001599',
            tokenBName: 'DAI',
        },
        validTriple: {
            tokenA: '0x0000000000000000000000000000000000120f46',
            tokenAName: 'SAUCE',
            tokenB: '0x0000000000000000000000000000000000003ad2',
            tokenBName: 'HBAR',
            tokenC: '0x0000000000000000000000000000000000001599',
            tokenCName: 'DAI',
        },
        address: '0xE99c8D7ee2925548a7263aF061E59aA487d22fDe',
        router: '0x0000000000000000000000000000000000004b40',
        aggregatorId: 'SaucerSwapV1',
        tokensToAssociate: [
            ['0.0.15058', '0.0.2231533', '0.0.1183558', '0.0.5529', '0.0.5449'],
        ],
        whbarToken: '0x0000000000000000000000000000000000003ad2',
        whbarContract: '0x0000000000000000000000000000000000003ad1',
        adapterContract: 'SaucerSwapAdapter',
    },
    /*PangolinOracle: {
        factory: '0x0000000000000000000000000000000000289a9a',
        validPair: {
            tokenA: '0x0000000000000000000000000000000000070293',
            tokenAName: 'PBAR',
            tokenB: '0x00000000000000000000000000000000000274a3',
            tokenBName: 'USDC',
        },
        validPairHbar: {
            tokenA: '0x000000000000000000000000000000000002690a',
            tokenAName: 'HBAR',
            tokenB: '0x0000000000000000000000000000000000070293',
            tokenBName: 'PBAR',
        },
        address: '0xE0dE0dCB67B2051e999a1B8232657E49BBf78eB2',
        router: '0x0000000000000000000000000000000000289a9e',
        aggregatorId: 'Pangolin',
        tokensToAssociate: [['0.0.157962', '0.0.160931',  '0.0.459411']],
        whbarToken: '0x0000000000000000000000000000000000289a91',
        whbarContract: '0x0000000000000000000000000000000000289a90',
        adapterContract: 'PangolinAdapter',
    },*/
};
         //  ['0.0.1062664', '0.0.127877', '0.0.1738930'],

         //    ['0.0.859814', '0.0.834116', '0.0.968069', '0.0.1055472', '0.0.1055459', '0.0.926385', '0.0.624505',
         //        '0.0.1055477', '0.0.2171502', '0.0.1159074', '0.0.1455944', '0.0.1937609', '0.0.127877', '0.0.1122718'],
         //    ['0.0.2283230', '0.0.1079680', '0.0.1738930', '0.0.1128957', '0.0.1237128', '0.0.2764968', '0.0.1045722',
         //        '0.0.456858', '0.0.1144501', '0.0.1055483', '0.0.541564', '0.0.540318']

          //  ['0.0.1738807', '0.0.1738930']
          //   ['0.0.859814', '0.0.834116', '0.0.968069', '0.0.1055472', '0.0.1055459', '0.0.1159074', '0.0.1738930'],

            // ['0.0.127877'],

            // ['0.0.859814', '0.0.834116', '0.0.968069', '0.0.1055472', '0.0.1055459', '0.0.926385', '0.0.624505',
            //     '0.0.1055477', '0.0.2171502', '0.0.1455944', '0.0.1937609', '0.0.127877', '0.0.1122718'],
            // ['0.0.2283230', '0.0.1079680', '0.0.1128957', '0.0.1237128', '0.0.2764968', '0.0.1045722', '0.0.456858',
            //     '0.0.1144501', '0.0.1055483', '0.0.541564', '0.0.540318']

module.exports = { ORACLES };