// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PriceConverter.sol";
import "hardhat/console.sol";

error FundMe__NotEnoughEth();
error FundMe__ProblemWithWithdrawal();

/**
 * @title A contract for crowd funding.
 * @author William Giammona.
 * @dev This contract implements price feeds as our library.
 */

contract FundMe is Ownable {
    using PriceConverter for uint256;

    mapping(address => uint256) private s_addressToAmountFunded;
    address[] private s_funders;
    AggregatorV3Interface private immutable i_priceFeed;
    uint256 private immutable i_minimumUsd;

    /**
     * @param priceFeed - The chain specific Aggregator Contract.
     * @param minUsd - The minimum USD amount needed to fund the contract (it can be set to 0).
     * @dev minUsd is multiplied by 10**18 to set it in terms of ETH instead of WEI.
     */

    constructor(address priceFeed, uint256 minUsd) {
        i_priceFeed = AggregatorV3Interface(priceFeed);
        i_minimumUsd = minUsd * 10**18;
    }

    /**
     * @dev Receive and Fallback call fund() if user sent ETH w/out calling fund().
     */
    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    /**
     * @notice Funds this contract. Reverts if ETH amount < ETH equivalent of i_minimumUsd.
     */

    function fund() public payable {
        if (msg.value.getConversionRate(i_priceFeed) < i_minimumUsd) {
            revert FundMe__NotEnoughEth();
        }
        s_funders.push(msg.sender);
        s_addressToAmountFunded[msg.sender] += msg.value;
    }

    /// @notice Allows contract owner to withdraw treasury.

    function withdraw() public payable onlyOwner {
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        if (success) {
            address[] memory funders = s_funders;
            for (uint256 funderIndex = 0; funderIndex < funders.length; funderIndex++) {
                address funder = funders[funderIndex];
                s_addressToAmountFunded[funder] = 0;
            }
            s_funders = new address[](0);
        } else {
            revert FundMe__ProblemWithWithdrawal();
        }
    }

    /**
     * @param funder Funder's address to find out how much they funded this contract
     * @return s_addressToAmountFunded The value the funder put into this contract
     */
    function getAddressToAmountFunded(address funder) public view returns (uint256) {
        return s_addressToAmountFunded[funder];
    }

    /**
     * @param index The index for the location of the funder in the funders array.
     * @return s_funders Returns the funder's address at the index location.
     */
    function getFunders(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    /**
     * @return i_priceFeed Returns the Aggregator address.
     */
    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return i_priceFeed;
    }

    /**
     * @return i_minimumUsd Returns the min amt of USD needed to fund this contract.
     * @dev Please note, it's divided by 10**18 to eliminate the 18 zeros added in the constructor.
     */
    function getMinUsd() public view returns (uint256) {
        return (i_minimumUsd / 10**18);
    }
}
