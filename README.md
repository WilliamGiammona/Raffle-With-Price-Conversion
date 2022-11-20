# Raffle

PLEASE CHECK ALL RELEVANT LAWS AND LEGAL REQUIREMENTS BEFORE DEPLOYING TO MAINNET

# What is it for?

This project creates a trustless, untamperable, decentralized Raffle smart contract on an EVM compatible blockchain. Anyone can enter the raffle as long as they pay the minimum entry fee. The owner of the contract sets the minimum funding amount in dollars (It's converted to ETH using the PriceConverter.sol file and gets the current ETH to USD price using the price feed contract provided by chainlink). Only the owner can, after certain paramaters are met (listed in the requestRandomWords() function of the Raffle contract), end the raffle, whereby a random number from a chainlink VRF contract (off chain) is given to select the winner (who receives the entire treasury).

# Getting Started

### Installation

In your terminal, type the following

```shell
git clone https://github.com/WilliamGiammona/Raffle.git

yarn
```

Next You Will Need The Following:

A .env file with:

- MAINNET_RPC_URL= your personal mainnet RPC_URL (you can get this from https://www.infura.io/)
- GOERLI_RPC_ULR= your personal goerli test net RPC_URL (you can also get this from https://www.infura.io/)
- SEPOLIA_RPC_URL= your personal sepolia test net RPC_URL (you can also get this from https://www.infura.io/)
- PRIVATE_KEY= your private key (you can get this from the metamask chrome extension )
- ETHERSCAN_API_KEY= your etherscan api key (you can get this from https://etherscan.io/)
- COINMARKETCAP_API_KEY= your coinmarket api key (you can get this from https://coinmarketcap.com/)

### What you'll find

The main folders are:

- contracts - where the solidity contracts are stored
- test - where you run your tests
- deploy - where you write your deploy scripts
- utils - where you can find the etherscan verification script
- typechain-types - sets the types of the contracts
- gas-report.txt (comes after running hh test) - shows the gas and gas price associated with the contract deployment and functions

### Deployment

To deploy the Smart Contract, you'll first need to make sure your default network is correctly set. Go to the hardhat.config.ts file and add the network you want to deploy to ("mainnet" if you want to upload it to the ethereum mainnet). To add an additional network, you must add it in the networks object, and add the appropriate RPC URL in your .env file.

Inside the deploy folder in the 01-deploy-Raffle.ts, the args variable contains the arguments for the Raffle contract. The Raffle contract's second argument is the minimum dollar amount you want the funder to send, and is set to 50 by default, but can be changed to fit your projects specific needs. In order to change it, go to the helper-hardhat-config.ts file and adjust appropriately.

Finally, go to the terminal and type:

```shell
hh deploy
```

### Testing

To run tests, you'll first need to make sure your default network is correctly set. Go to the hardhat.config.ts file and add "hardhat" (it should already be set to this) if you want to test locally, "goerli" or "sepolia" if you want to test on a test network, or "mainnet" if you want to upload it to the ethereum main net. To add an additional network, you must add it in the networks object, and add the appropriate RPC URL in your .env file.

After adding the correct default network, add any additional tests you want to run in the test folder. Local tests should be run in the unit folder while TestNet tests should be run in the staging folder.

Finally, go to the terminal and type:

```shell
hh test
```
