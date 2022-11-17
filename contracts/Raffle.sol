// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "hardhat/console.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

error Raffle__NotEnoughETH();
error Raffle__AlreadyInRaffle();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__NotEnoughTimeSinceLastRaffle();
error Raffle__NotEnoughParticipants();

/**
 * @title A sample raffle contract
 * @author William Giammona
 * @notice This contract is for creating a trustless, untamperable, decentralized Raffle
 * @notice PLEASE CHECK ALL RELEVANT LAWS AND LEGAL REQUIREMENTS BEFORE DEPLOYING TO MAINNET
 * @dev This contract uses Chainlink VRF V2 and Chainlink Aggregator contracts
 */

contract Raffle is VRFConsumerBaseV2, ConfirmedOwner {
    using PriceConverter for uint256;

    // Events
    event EnteredRaffle(address indexed participant);
    event RequestSent(uint256 indexed requestId);
    event RequestFulfilled(uint256 indexed requestId, uint256[] indexed randomWords, address indexed winner);

    // Types
    struct RequestStatus {
        bool fulfilled; /* Whether the request has been successfully fulfilled */
        bool exists; /* Whether a requestId exists */
        uint256[] randomWords; /* The generated random numbers */
    }

    enum RaffleState {
        OPEN,
        CALCULATING /* chainlink node generating number to prevent new participants joining at this time */
    }

    // Immutable / Constant vars
    uint256 private immutable i_minEntryFee;
    uint256 private immutable i_timeInterval;
    AggregatorV3Interface private immutable i_priceFeedContract;
    VRFCoordinatorV2Interface private immutable i_coordinatorContract;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId;
    uint16 private immutable i_requestConfirmations;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1; /* How many numbers we want generated (Only want 1) */

    // Storage vars
    mapping(uint256 => RequestStatus) private s_requests; /* requestId --> requestStatus */
    RaffleState private s_raffleState; /* If raffle is open or calculating (generating random number) */
    address payable[] private s_participants; /* array of raffle participants */
    address payable private s_winner; /* The most recent winner */
    uint256 private s_lastTimeStamp; /* Time last raffle finished */
    uint256 private s_lastRequestId;

    // Special Functions

    /**
     * @param minEntryFee - The minimum entry fee to enter the raffle (enter as USD, will be converted to ETH equivalent)
     * @param timeInterval - The amount of time to wait between raffles
     * @param priceFeedAddr - The chainlink price feed address we use to get ETH/USD price (https://docs.chain.link/docs/data-feeds/price-feeds/)
     * @dev Use docs for further info on below vars (https://docs.chain.link/docs/vrf/v2/subscription/examples/get-a-random-number/)
     * @param coordinatorAddress - The chainlink coordinator address we use to generate a random number
     * @param keyHash - How much to pay chainlink node in WEI to generate a random number (requestRandomWords())
     * @param subscriptionId - Id used to fund chainlink contracts
     * @param requestConfirmations - How many additional blocks need to be added to the chain after number generated
     * @param callbackGasLimit - Gas limit for fulfillRandomWords()
     */

    constructor(
        uint256 minEntryFee,
        uint256 timeInterval,
        address priceFeedAddr,
        address coordinatorAddress,
        bytes32 keyHash,
        uint64 subscriptionId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(coordinatorAddress) ConfirmedOwner(msg.sender) {
        i_minEntryFee = minEntryFee * 1e18; /* multipy i_minEntryFee by 10^18 b/c ETH is 10^18 WEI */
        i_timeInterval = timeInterval;
        i_priceFeedContract = AggregatorV3Interface(priceFeedAddr);
        i_coordinatorContract = VRFCoordinatorV2Interface(coordinatorAddress);
        i_keyHash = keyHash;
        i_subscriptionId = subscriptionId;
        i_requestConfirmations = requestConfirmations;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
    }

    receive() external payable {
        enterRaffle();
    }

    fallback() external payable {
        enterRaffle();
    }

    // Regular Functions

    /**
     * @dev participants only enter the raffle if:
     * 1) The state is open (chainlink node isn't generating a number)
     * 2) They send the minimum required entry fee
     * 3) They haven't already joined the current raffle
     */

    function enterRaffle() public payable {
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        if (msg.value.convertEthToUsd(i_priceFeedContract) < i_minEntryFee) {
            revert Raffle__NotEnoughETH();
        }
        address payable[] memory participants = s_participants;
        for (uint256 index = 0; index < participants.length; index++) {
            if (participants[index] == msg.sender) {
                revert Raffle__AlreadyInRaffle();
            }
        }
        s_participants.push(payable(msg.sender));
        emit EnteredRaffle(msg.sender);
    }

    /**
     * @dev For requestRandomWords, fulfillRandomWords, and getRequestStatus docs read (https://docs.chain.link/docs/vrf/v2/subscription/examples/get-a-random-number/)
     */

    function requestRandomWords() external onlyOwner returns (uint256 requestId) {
        // Will revert if subscription is not set and funded.

        // Make sure enough time has passed between now and the previous raffle
        if ((block.timestamp - s_lastTimeStamp) < i_timeInterval) {
            revert Raffle__NotEnoughTimeSinceLastRaffle();
        }
        // Make sure the raffle state is open
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        // Make sure there's at least one participant in the raffle
        if (s_participants.length < 1) {
            revert Raffle__NotEnoughParticipants();
        }
        s_raffleState = RaffleState.CALCULATING; /* Don't let anyone new join the raffle */
        requestId = i_coordinatorContract.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            i_requestConfirmations,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requests[requestId] = RequestStatus({randomWords: new uint256[](0), exists: true, fulfilled: false});
        s_lastRequestId = requestId;
        emit RequestSent(requestId);
        return requestId;
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        require(s_requests[_requestId].exists, "request not found");
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId].randomWords = _randomWords;
        uint256 winnerIndex = _randomWords[0] % s_participants.length; /* Set the winner index w/ modulo */
        s_winner = s_participants[winnerIndex]; /* Sets the winner */
        s_raffleState = RaffleState.OPEN; /* Reopen the raffle state */
        s_participants = new address payable[](0); /* Reset the participants array */
        s_lastTimeStamp = block.timestamp; /* Reset the timestamp */
        //Give the winner their winnings
        (bool success, ) = s_winner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        //Added the winner to the chainlink event
        emit RequestFulfilled(_requestId, _randomWords, s_winner);
    }

    // View / Pure functions

    function getRequestStatus(uint256 _requestId) external view returns (bool fulfilled, uint256[] memory randomWords) {
        require(s_requests[_requestId].exists, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request.randomWords);
    }

    function getPriceFeedContract() public view returns (AggregatorV3Interface) {
        return i_priceFeedContract;
    }

    function getCoordinatorContract() public view returns (VRFCoordinatorV2Interface) {
        return i_coordinatorContract;
    }

    function getMinEntryFee() public view returns (uint256) {
        return i_minEntryFee;
    }

    function getTimeInterval() public view returns (uint256) {
        return i_timeInterval;
    }

    function getTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getParticipants(uint256 index) public view returns (address) {
        return s_participants[index];
    }

    function getNumParticipants() public view returns (uint256) {
        return s_participants.length;
    }

    function getWinner() public view returns (address) {
        return s_winner;
    }

    function getLastRequestId() public view returns (uint256) {
        return s_lastRequestId;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getKeyHash() public view returns (bytes32) {
        return i_keyHash;
    }

    function getSubscriptionId() public view returns (uint64) {
        return i_subscriptionId;
    }

    function getRequestConfirmations() public view returns (uint16) {
        return i_requestConfirmations;
    }

    function getCallbackGasLimit() public view returns (uint32) {
        return i_callbackGasLimit;
    }

    function getNumWords() public pure returns (uint32) {
        return NUM_WORDS;
    }
}
