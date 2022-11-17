// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.8;

import "hardhat/console.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title A ETH to USD converting library
 * @author William Giammona
 * @notice This library converts ETH to USD
 * @dev This library uses the Chainlink Aggregator Contract
 */

library PriceConverter {
    /**
     * @param msgVal - the value of ETH sent by the participant's wallet.
     * @param priceFeedContract - The chainlink price feed contract giving us our ETH to USD price
     */
    function convertEthToUsd(uint256 msgVal, AggregatorV3Interface priceFeedContract) internal view returns (uint256) {
        (, int256 price, , , ) = priceFeedContract.latestRoundData();
        /// priceFeedContract returns 8 decimals and a uint256. Must multiply by 10 more (ETH is 10^18 WEI)
        /// Must cast as uint256 (We don't want negative entry fees).
        uint256 ethPriceToUsd = uint256(price * 1e10);
        /// Multiplication creates 36 0s. Need 18, so must divide
        uint256 convertedMsgValToUsd = (ethPriceToUsd * msgVal) / 1e18;
        return convertedMsgValToUsd;
    }
}
