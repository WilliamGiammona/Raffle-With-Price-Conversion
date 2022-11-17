import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { networkConfig } from "../helper-hardhat-config";
import { BigNumber } from "ethers";

const deployMock: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network, ethers } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId: number = network.config.chainId!;
    const BASE_FEE = ethers.utils.parseEther("0.25").toString();
    const GAS_PRICE_PER_LINK = 1e9;

    /**
     * @dev 8 is for the # of decimals on the chainlink price feed contract (The mainnet contract has 8).
     * @dev 200000000000 is for a ETH to USD price of 2000 w/ 8 decimals.
     */
    const args1: [number, number] = [8, 200000000000];
    const args2: [string, number] = [BASE_FEE, GAS_PRICE_PER_LINK];

    if (chainId === 31337) {
        console.log("Deploying MocksV3Aggregator...");

        const MockV3Aggregator = await deploy("MockV3Aggregator", {
            from: deployer,
            args: args1,
            log: true,
            autoMine: true,
            waitConfirmations: networkConfig[chainId].blockConfirmations || 1,
        });
        console.log("MocksV3Aggregator Deployed!!!");
        console.log("------------------------------------------");

        console.log("Deploying MockVRFCoordinatorV2...");

        const MockVRFCoordinatorV2 = await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: args2,
            log: true,
            autoMine: true,
            waitConfirmations: networkConfig[chainId].blockConfirmations || 1,
        });
        console.log("MockVRFCoordinatorV2 Deployed!!!");

        console.log("You are deploying to a local network, you'll need a local network running to interact");
        console.log(
            "Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!"
        );
        console.log("----------------------------------");
    }
};
export default deployMock;
deployMock.tags = ["all", "mocks"];
